// Search provider adapters.
// Turns a Google footprint query into a list of raw search results.
//
// Modes:
//  - "basic": scrapes DuckDuckGo HTML + Bing HTML (no API key). Both support
//             site: operators. DDG goes first; if throttled, falls back to Bing.
//             Free but SLOWER (throttled 2s between requests) and capped.
//  - "api"  : Google Custom Search JSON API or SerpAPI. Faster, more results,
//             but consumes your paid/free quota.
//
// All errors are scrubbed of secrets before being thrown (see security.ts).

import { scrubSecrets } from "./security";

export interface RawResult {
  title: string;
  link: string;
  snippet: string;
}

export type SearchMode = "basic" | "api";
export type ProviderName = "google_cse" | "serpapi" | "duckduckgo" | "bing" | "basic_multi" | "none";

// Per-mode limits (max results the UI/route will honor + throttle delay).
export const MODE_LIMITS: Record<SearchMode, { maxResults: number; delayMs: number; label: string }> = {
  basic: { maxResults: 40, delayMs: 2000, label: "Basic (Footprints)" },
  api: { maxResults: 100, delayMs: 0, label: "API (Google / SerpAPI)" },
};

/** Which API provider is configured (for "api" mode). */
export function apiProvider(): ProviderName {
  if (process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_CX) return "google_cse";
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
// API MODE — Google Custom Search JSON API
// ---------------------------------------------------------------------------

async function searchGoogleCSE(query: string, start = 1, gl = ""): Promise<RawResult[]> {
  const key = process.env.GOOGLE_CSE_KEY!;
  const cx = process.env.GOOGLE_CSE_CX!;
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  url.searchParams.set("start", String(start));
  if (gl) {
    url.searchParams.set("gl", gl);
    url.searchParams.set("cr", `country${gl.toUpperCase()}`);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Google CSE error ${res.status}`);
  const data = await res.json();
  const items = (data.items || []) as Array<{ title: string; link: string; snippet: string }>;
  return items.map((i) => ({ title: i.title || "", link: i.link || "", snippet: i.snippet || "" }));
}

// ---------------------------------------------------------------------------
// API MODE — SerpAPI
// ---------------------------------------------------------------------------

async function searchSerpApi(query: string, start = 0, gl = ""): Promise<RawResult[]> {
  const key = process.env.SERPAPI_KEY!;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  url.searchParams.set("start", String(start));
  url.searchParams.set("api_key", key);
  if (gl) {
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
export async function runSearch(query: string, page = 0, mode: SearchMode = "api", gl = ""): Promise<RawResult[]> {
  if (mode === "basic") {
    if (page > 0) return [];
    await sleep(MODE_LIMITS.basic.delayMs);
    return searchBasicMulti(query, gl);
  }

  const provider = apiProvider();
  switch (provider) {
    case "google_cse":
      return searchGoogleCSE(query, page * 10 + 1, gl);
    case "serpapi":
      return searchSerpApi(query, page * 10, gl);
    default:
      return [];
  }
}
