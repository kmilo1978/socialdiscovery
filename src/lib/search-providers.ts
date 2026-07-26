// Search provider adapters.
// Turns a Google footprint query into a list of raw search results.
// Supports: Google Custom Search JSON API, SerpAPI. Falls back gracefully.

export interface RawResult {
  title: string;
  link: string;
  snippet: string;
}

export type ProviderName = "google_cse" | "serpapi" | "none";

export function activeProvider(): ProviderName {
  if (process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_CX) return "google_cse";
  if (process.env.SERPAPI_KEY) return "serpapi";
  return "none";
}

/**
 * Google Programmable Search Engine (Custom Search JSON API).
 * Free tier: 100 queries/day. Requires GOOGLE_CSE_KEY + GOOGLE_CSE_CX.
 * https://developers.google.com/custom-search/v1/overview
 */
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
    const body = await res.text();
    throw new Error(`Google CSE error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const items = (data.items || []) as Array<{ title: string; link: string; snippet: string }>;
  return items.map((i) => ({
    title: i.title || "",
    link: i.link || "",
    snippet: i.snippet || "",
  }));
}

/**
 * SerpAPI adapter. Free tier: 100 searches/month. Requires SERPAPI_KEY.
 * https://serpapi.com/search-api
 */
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
    const body = await res.text();
    throw new Error(`SerpAPI error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const items = (data.organic_results || []) as Array<{
    title: string;
    link: string;
    snippet: string;
  }>;
  return items.map((i) => ({
    title: i.title || "",
    link: i.link || "",
    snippet: i.snippet || "",
  }));
}

/**
 * Runs a single query through the active provider.
 * `page` is 0-indexed.
 */
export async function runSearch(query: string, page = 0): Promise<RawResult[]> {
  const provider = activeProvider();
  switch (provider) {
    case "google_cse":
      return searchGoogleCSE(query, page * 10 + 1);
    case "serpapi":
      return searchSerpApi(query, page * 10);
    default:
      return [];
  }
}
