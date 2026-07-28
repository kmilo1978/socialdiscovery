// Search provider adapters.
// Turns a Google footprint query into a list of raw search results.
//
// Modes:
//  - "basic": scrapes DuckDuckGo HTML + Bing HTML (no API key). Both support
//             site: operators. DDG goes first; if throttled, falls back to Bing.
//             Free but SLOWER (throttled 2s between requests) and capped.
//  - "api"  : SerpAPI. Faster, more results, but consumes your paid/free quota.
//
// All errors are scrubbed of secrets before being thrown (see security.ts).

import { scrubSecrets } from "./security";
import { getNextApiKey } from "./api-keys";

export interface RawResult {
  title: string;
  link: string;
  snippet: string;
}

export type SearchMode = "basic" | "api";
export type ProviderName = "serpapi" | "duckduckgo" | "bing" | "basic_multi" | "none";

// Per-mode limits (max results the UI/route will honor + throttle delay).
export const MODE_LIMITS: Record<SearchMode, { maxResults: number; delayMs: number; label: string }> = {
  basic: { maxResults: 40, delayMs: 2000, label: "Basic (Footprints)" },
  api: { maxResults: 250, delayMs: 0, label: "API (SerpAPI)" },
};

/** Which API provider is configured (for "api" mode). */
export function apiProvider(): ProviderName {
  // Check for key pool (SERPAPI_KEYS) or single key (SERPAPI_KEY)
  const pool = process.env.SERPAPI_KEYS;
  if (pool && pool.split(",").some((k) => k.trim().length > 10)) return "serpapi";
  if (process.env.SERPAPI_KEY) return "serpapi";
  return "none";
}

/** Back-compat: the active provider considering both modes. */
export function activeProvider(): ProviderName {
  return apiProvider();
}

/** Resolves the effective provider for a requested mode. */
export function providerForMode(mode: SearchMode): ProviderName {
  if (mode === "basic") return "basic_multi"; // DDG + Bing rotation
  return apiProvider();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const COMMON_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// UTILITY
// ---------------------------------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// BING HTML SCRAPER (no API key, supports site: operators)
// ---------------------------------------------------------------------------

function parseBingHtml(html: string): RawResult[] {
  const results: RawResult[] = [];

  // Bing result blocks: <li class="b_algo"> ... <h2><a href="URL">TITLE</a></h2> ... <p class="b_lineclamp...">SNIPPET</p>
  const blockRegex = /<li\s+class="b_algo">([\s\S]*?)<\/li>/g;
  const linkRegex = /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/;
  const snippetRegex = /<p[^>]*>([\s\S]*?)<\/p>/;

  let block: RegExpExecArray | null;
  while ((block = blockRegex.exec(html)) !== null) {
    const content = block[1];
    const linkMatch = linkRegex.exec(content);
    if (!linkMatch) continue;
    const link = decodeEntities(linkMatch[1]);
    const title = stripTags(linkMatch[2]);
    const snipMatch = snippetRegex.exec(content);
    const snippet = snipMatch ? stripTags(snipMatch[1]) : "";

    // Skip Bing ad/noise
    if (link.includes("bing.com/") || link.includes("microsoft.com/bing")) continue;

    results.push({ title, link, snippet });
  }
  return results;
}

async function searchBing(query: string, gl = ""): Promise<RawResult[]> {
  // Bing search URL with region parameter.
  const url = new URL("https://www.bing.com/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "20");
  if (gl) {
    url.searchParams.set("cc", gl.toUpperCase());
    url.searchParams.set("setlang", "en");
  }

  // Try two UA strategies: modern Chrome first, then an older IE-like UA
  // that Bing sometimes serves server-rendered HTML to.
  const userAgents = [
    COMMON_UA,
    "Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko",
  ];

  for (const ua of userAgents) {
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: {
          "User-Agent": ua,
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
    } catch (err) {
      throw new Error(scrubSecrets(`Bing request failed: ${err instanceof Error ? err.message : "network error"}`));
    }

    if (res.status === 429) {
      throw new Error("Bing rate-limited. Wait and retry.");
    }
    if (!res.ok) continue;

    const html = await res.text();
    const results = parseBingHtml(html);
    if (results.length > 0) return results;
    // If no b_algo found, try next UA.
  }
  return [];
}

// ---------------------------------------------------------------------------
// DUCKDUCKGO HTML SCRAPER
// ---------------------------------------------------------------------------

function resolveDdgLink(href: string): string {
  try {
    const full = href.startsWith("//") ? `https:${href}` : href;
    const u = new URL(full);
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return full;
  } catch {
    return href;
  }
}

function parseDdgHtml(html: string): RawResult[] {
  const results: RawResult[] = [];
  const blockRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  const titles: Array<{ link: string; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(html)) !== null) {
    const link = resolveDdgLink(m[1]);
    if (link.includes("duckduckgo.com/y.js") || link.includes("duckduckgo.com/l/")) continue;
    titles.push({ link, title: stripTags(m[2]) });
  }
  const snippets: string[] = [];
  let s: RegExpExecArray | null;
  while ((s = snippetRegex.exec(html)) !== null) {
    snippets.push(stripTags(s[1]));
  }
  for (let i = 0; i < titles.length; i++) {
    results.push({ title: titles[i].title, link: titles[i].link, snippet: snippets[i] || "" });
  }
  return results;
}

async function fetchDdg(endpoint: string, query: string, kl = "wt-wt"): Promise<{ status: number; html: string }> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": COMMON_UA,
      "Accept-Language": "en-US,en;q=0.9",
    },
    body: new URLSearchParams({ q: query, kl }).toString(),
  });
  return { status: res.status, html: await res.text() };
}

async function searchDuckDuckGo(query: string, gl = ""): Promise<RawResult[]> {
  const endpoints = ["https://html.duckduckgo.com/html/", "https://lite.duckduckgo.com/lite/"];
  let lastStatus = 0;

  let kl = "wt-wt";
  if (gl) {
    const { getGeoByGl } = await import("./geolocations");
    kl = getGeoByGl(gl).kl;
  }

  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let r: { status: number; html: string };
      try {
        r = await fetchDdg(endpoint, query, kl);
      } catch (err) {
        throw new Error(
          scrubSecrets(`DuckDuckGo request failed: ${err instanceof Error ? err.message : "network error"}`)
        );
      }
      lastStatus = r.status;

      if (r.status === 202 || r.status === 429) {
        if (attempt === 0) { await sleep(3000); continue; }
        break;
      }
      if (r.status >= 400) break;

      const parsed = parseDdgHtml(r.html);
      if (parsed.length > 0) return parsed;
      break;
    }
  }

  if (lastStatus === 202 || lastStatus === 429) {
    // Signal throttled — let the caller fall back to Bing.
    throw new Error("DDG_THROTTLED");
  }
  return [];
}

// ---------------------------------------------------------------------------
// BASIC MODE ORCHESTRATOR — DDG + Bing with fallback/rotation
// ---------------------------------------------------------------------------

/**
 * Basic mode strategy:
 * 1. Try DuckDuckGo first (best footprint support).
 * 2. If DDG is throttled, fall back to Bing.
 * 3. Merge results from both if DDG partially worked.
 */
async function searchBasicMulti(query: string, gl = ""): Promise<RawResult[]> {
  let ddgResults: RawResult[] = [];
  let ddgThrottled = false;

  try {
    ddgResults = await searchDuckDuckGo(query, gl);
  } catch (err) {
    if (err instanceof Error && err.message === "DDG_THROTTLED") {
      ddgThrottled = true;
    }
    // Other DDG errors: silently fall through to Bing.
  }

  // If DDG gave results, return them.
  if (ddgResults.length > 0) return ddgResults;

  // Fallback: try Bing.
  await sleep(1000); // Brief pause before hitting another engine.
  try {
    const bingResults = await searchBing(query, gl);
    if (bingResults.length > 0) return bingResults;
  } catch {
    // Bing also failed — last resort: both are down/blocking.
  }

  // If DDG was specifically throttled and Bing also failed, give a clear error.
  if (ddgThrottled) {
    throw new Error(
      "Both search engines are rate-limiting this IP. Wait 1-2 minutes and retry, or switch to API mode."
    );
  }

  return [];
}

// ---------------------------------------------------------------------------
// API MODE — SerpAPI (Google Maps engine for GMB)
// ---------------------------------------------------------------------------

async function searchGoogleMaps(query: string, gl = ""): Promise<RawResult[]> {
  const key = getNextApiKey();
  if (!key) throw new Error("No SerpAPI key configured");
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_maps");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", key);
  if (gl) {
    url.searchParams.set("gl", gl);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SerpAPI Maps error ${res.status}`);
  const data = await res.json();
  const items = (data.local_results || []) as Array<{
    title?: string;
    address?: string;
    phone?: string;
    website?: string;
    place_id?: string;
    rating?: number;
    reviews?: number;
    type?: string;
    thumbnail?: string;
  }>;

  // Convert Maps results to RawResult format so the extractor can process them.
  return items.map((i) => {
    const parts: string[] = [];
    if (i.phone) parts.push(i.phone);
    if (i.website) parts.push(i.website);
    if (i.address) parts.push(i.address);
    if (i.rating) parts.push(`Rating: ${i.rating}`);
    if (i.type) parts.push(i.type);

    return {
      title: i.title || "",
      link: i.website || `https://www.google.com/maps/place/?q=place_id:${i.place_id || ""}`,
      snippet: parts.join(" | "),
    };
  });
}

// ---------------------------------------------------------------------------
// API MODE — SerpAPI (Google Search engine)
// ---------------------------------------------------------------------------

async function searchSerpApi(query: string, start = 0, gl = ""): Promise<RawResult[]> {
  const key = getNextApiKey();
  if (!key) throw new Error("No SerpAPI key configured");
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  // IMPORTANT: only send `start` for page > 0. Sending `start=0` explicitly
  // (even though it's the default) makes SerpAPI/Google return unrelated
  // generic results instead of honoring the site:/quoted-OR footprint query.
  // Confirmed via direct testing — omitting it for the first page fixes it.
  if (start > 0) {
    url.searchParams.set("start", String(start));
  }
  url.searchParams.set("api_key", key);
  if (gl) {
    // gl = geolocation (ISO country code); google_domain keeps results on google.com
    // while gl localizes them, matching the region the user selected.
    url.searchParams.set("gl", gl);
    url.searchParams.set("google_domain", "google.com");
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SerpAPI error ${res.status}`);
  const data = await res.json();
  const items = (data.organic_results || []) as Array<{ title: string; link: string; snippet: string }>;
  return items.map((i) => ({ title: i.title || "", link: i.link || "", snippet: i.snippet || "" }));
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Runs a single query in the requested mode. `page` is 0-indexed.
 * `gl` is the Google geolocation code (ISO 3166-1 alpha-2, e.g. "us", "co").
 * In basic mode, pagination isn't supported (single-page scraping), so
 * only page 0 yields results.
 */
export async function runSearch(query: string, page = 0, mode: SearchMode = "api", gl = "", platform = ""): Promise<RawResult[]> {
  if (mode === "basic") {
    if (page > 0) return [];
    await sleep(MODE_LIMITS.basic.delayMs);
    return searchBasicMulti(query, gl);
  }

  const provider = apiProvider();
  if (provider === "none") return [];

  // Google Maps engine for GMB (much better results than web footprints).
  if (platform === "gmb-keyword") {
    if (page > 0) return []; // Maps API doesn't paginate the same way.
    return searchGoogleMaps(query, gl);
  }

  return searchSerpApi(query, page * 10, gl);
}
