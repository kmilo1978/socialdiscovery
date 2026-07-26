// Search provider adapters.
// Turns a Google footprint query into a list of raw search results.
//
// Two modes:
//  - "basic": scrapes DuckDuckGo's HTML endpoint (supports site: operators, no
//             API key). Free but SLOWER (throttled) and capped to fewer results.
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
export type ProviderName = "google_cse" | "serpapi" | "duckduckgo" | "none";

// Per-mode limits (max results the UI/route will honor + throttle delay).
export const MODE_LIMITS: Record<SearchMode, { maxResults: number; delayMs: number; label: string }> = {
  basic: { maxResults: 30, delayMs: 2500, label: "Basic (Footprints)" },
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
  if (mode === "basic") return "duckduckgo";
  return apiProvider();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// BASIC MODE — DuckDuckGo HTML scraping (no API key)
// ---------------------------------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/** Resolves a DuckDuckGo redirect href (//duckduckgo.com/l/?uddg=...) to the real URL. */
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
  // Each result block contains a result__a anchor (title+link) and result__snippet.
  const blockRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  const titles: Array<{ link: string; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(html)) !== null) {
    const link = resolveDdgLink(m[1]);
    // Skip DuckDuckGo ad/redirect noise.
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

async function fetchDdg(endpoint: string, query: string): Promise<{ status: number; html: string }> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // A realistic UA reduces the chance of being served a challenge page.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    body: new URLSearchParams({ q: query, kl: "wt-wt" }).toString(),
  });
  return { status: res.status, html: await res.text() };
}

async function searchDuckDuckGo(query: string): Promise<RawResult[]> {
  const endpoints = ["https://html.duckduckgo.com/html/", "https://lite.duckduckgo.com/lite/"];
  let lastStatus = 0;

  // Try each endpoint; retry once on a soft-block (202/429) after a longer wait.
  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let r: { status: number; html: string };
      try {
        r = await fetchDdg(endpoint, query);
      } catch (err) {
        throw new Error(
          scrubSecrets(`DuckDuckGo request failed: ${err instanceof Error ? err.message : "network error"}`)
        );
      }
      lastStatus = r.status;

      // 202/429 = anti-bot challenge / throttle. Back off and retry once.
      if (r.status === 202 || r.status === 429) {
        if (attempt === 0) {
          await sleep(3500);
          continue;
        }
        break; // move to next endpoint
      }
      if (r.status >= 400) break; // hard error, try next endpoint

      const parsed = parseDdgHtml(r.html);
      if (parsed.length > 0) return parsed;
      break; // 200 but empty -> try next endpoint
    }
  }

  // Nothing found. If we were consistently challenged, tell the caller clearly.
  if (lastStatus === 202 || lastStatus === 429) {
    throw new Error(
      "Basic mode was rate-limited by the search engine. Wait a moment and retry, or use API mode."
    );
  }
  return [];
}

// ---------------------------------------------------------------------------
// API MODE — Google Custom Search JSON API
// ---------------------------------------------------------------------------

async function searchGoogleCSE(query: string, start = 1): Promise<RawResult[]> {
  const key = process.env.GOOGLE_CSE_KEY!;
  const cx = process.env.GOOGLE_CSE_CX!;
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  url.searchParams.set("start", String(start));

  const res = await fetch(url.toString());
  if (!res.ok) {
    // NEVER include the request URL (it carries the key). Only the status.
    throw new Error(`Google CSE error ${res.status}`);
  }
  const data = await res.json();
  const items = (data.items || []) as Array<{ title: string; link: string; snippet: string }>;
  return items.map((i) => ({ title: i.title || "", link: i.link || "", snippet: i.snippet || "" }));
}

// ---------------------------------------------------------------------------
// API MODE — SerpAPI
// ---------------------------------------------------------------------------

async function searchSerpApi(query: string, start = 0): Promise<RawResult[]> {
  const key = process.env.SERPAPI_KEY!;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  url.searchParams.set("start", String(start));
  url.searchParams.set("api_key", key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`SerpAPI error ${res.status}`);
  }
  const data = await res.json();
  const items = (data.organic_results || []) as Array<{ title: string; link: string; snippet: string }>;
  return items.map((i) => ({ title: i.title || "", link: i.link || "", snippet: i.snippet || "" }));
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Runs a single query in the requested mode. `page` is 0-indexed.
 * In basic mode, pagination isn't supported (DDG HTML returns one page), so
 * only page 0 yields results.
 */
export async function runSearch(query: string, page = 0, mode: SearchMode = "api"): Promise<RawResult[]> {
  if (mode === "basic") {
    if (page > 0) return []; // basic mode = single page
    // Throttle to avoid being blocked.
    await sleep(MODE_LIMITS.basic.delayMs);
    return searchDuckDuckGo(query);
  }

  const provider = apiProvider();
  switch (provider) {
    case "google_cse":
      return searchGoogleCSE(query, page * 10 + 1);
    case "serpapi":
      return searchSerpApi(query, page * 10);
    default:
      return [];
  }
}
