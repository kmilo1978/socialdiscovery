// URL enrichment module.
// Fetches each result's profile URL and extracts structured data:
// bio, followers, following, real name, external links, verified status.
// Works for Instagram, LinkedIn, TikTok, YouTube, Twitter/X, Facebook.
//
// Strategy: fetch the public HTML of each profile and parse the Open Graph
// meta tags + JSON-LD + visible content patterns. No login required.

import type { Lead } from "./extractors";

const COMMON_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_TIMEOUT = 8000;

export interface EnrichedData {
  bio: string;
  followers: string;
  following: string;
  fullName: string;
  externalUrl: string;
  verified: boolean;
  category: string;
  posts: string;
  profileImage: string;
}

const EMPTY_ENRICHED: EnrichedData = {
  bio: "",
  followers: "",
  following: "",
  fullName: "",
  externalUrl: "",
  verified: false,
  category: "",
  posts: "",
  profileImage: "",
};

// ---------------------------------------------------------------------------
// HTML FETCHER (with timeout + error swallowing)
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const res = await fetch(url, {
      headers: {
        "User-Agent": COMMON_UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// META TAG EXTRACTORS (OG tags, JSON-LD)
// ---------------------------------------------------------------------------

function extractMeta(html: string, property: string): string {
  // Matches: <meta property="og:..." content="VALUE"> or <meta name="..." content="VALUE">
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const alt = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
    "i"
  );
  const m = regex.exec(html) || alt.exec(html);
  return m ? m[1].trim() : "";
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const obj = JSON.parse(match[1]);
      // Return the first Person/Organization/ProfilePage object found.
      if (obj["@type"] && /Person|Organization|ProfilePage/i.test(String(obj["@type"]))) {
        return obj;
      }
      // Check @graph array (common in LinkedIn, YouTube)
      if (Array.isArray(obj["@graph"])) {
        const found = obj["@graph"].find(
          (x: Record<string, unknown>) => x["@type"] && /Person|Organization/i.test(String(x["@type"]))
        );
        if (found) return found;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// FOLLOWER/NUMBER PARSER
// ---------------------------------------------------------------------------

function parseNumber(raw: string): string {
  if (!raw) return "";
  const clean = raw.replace(/,/g, "").trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return raw.trim();
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(Math.round(num));
}

// ---------------------------------------------------------------------------
// PLATFORM-SPECIFIC EXTRACTORS
// ---------------------------------------------------------------------------

function enrichInstagram(html: string): EnrichedData {
  const data = { ...EMPTY_ENRICHED };

  // OG tags
  data.bio = extractMeta(html, "og:description") || "";
  data.fullName = extractMeta(html, "og:title")?.split(/[(@|•]/)[0].trim() || "";
  data.profileImage = extractMeta(html, "og:image") || "";

  // Instagram OG description often: "X Followers, Y Following, Z Posts - BIO"
  const statsMatch = data.bio.match(
    /([\d,.]+[KkMm]?)\s*Followers?,?\s*([\d,.]+[KkMm]?)\s*Following,?\s*([\d,.]+[KkMm]?)\s*Posts?\s*[-–—]?\s*(.*)/i
  );
  if (statsMatch) {
    data.followers = parseNumber(statsMatch[1]);
    data.following = parseNumber(statsMatch[2]);
    data.posts = parseNumber(statsMatch[3]);
    data.bio = statsMatch[4]?.trim() || data.bio;
  } else {
    // Try simpler patterns
    const fMatch = data.bio.match(/([\d,.]+[KkMm]?)\s*Followers?/i);
    if (fMatch) data.followers = parseNumber(fMatch[1]);
  }

  // External link from bio (linktree, website, etc.)
  const linkMatch = html.match(/"external_url"\s*:\s*"([^"]+)"/);
  if (linkMatch) data.externalUrl = decodeURI(linkMatch[1]);

  data.verified = html.includes('"is_verified":true') || html.includes("verified_badge");
  return data;
}

function enrichLinkedIn(html: string): EnrichedData {
  const data = { ...EMPTY_ENRICHED };

  data.fullName = extractMeta(html, "og:title")?.replace(/ [-|–].*/g, "").trim() || "";
  data.bio = extractMeta(html, "og:description") || "";
  data.profileImage = extractMeta(html, "og:image") || "";

  // JSON-LD (LinkedIn embeds rich structured data)
  const ld = extractJsonLd(html);
  if (ld) {
    data.fullName = (ld.name as string) || data.fullName;
    data.bio = (ld.description as string) || data.bio;
    if (ld.jobTitle) data.category = String(ld.jobTitle);
    if (ld.url) data.externalUrl = String(ld.url);
    // interactionStatistic -> followerCount
    const stats = ld.interactionStatistic as
      | Array<{ userInteractionCount?: number; interactionType?: { "@type": string } }>
      | undefined;
    if (Array.isArray(stats)) {
      const followerStat = stats.find(
        (s) => s.interactionType?.["@type"] === "FollowAction" || String(s.interactionType).includes("Follow")
      );
      if (followerStat?.userInteractionCount) {
        data.followers = parseNumber(String(followerStat.userInteractionCount));
      }
    }
  }

  // Fallback: LinkedIn OG descriptions often contain "X followers"
  const fMatch = data.bio.match(/([\d,.]+)\s*followers?/i);
  if (fMatch && !data.followers) data.followers = parseNumber(fMatch[1]);

  // Connections (LinkedIn specific)
  const connMatch = data.bio.match(/([\d,.]+)\+?\s*connections?/i);
  if (connMatch) data.following = parseNumber(connMatch[1]);

  return data;
}

function enrichTikTok(html: string): EnrichedData {
  const data = { ...EMPTY_ENRICHED };

  data.fullName = extractMeta(html, "og:title")?.split(/[(@|]/)[0].trim() || "";
  data.bio = extractMeta(html, "og:description") || "";
  data.profileImage = extractMeta(html, "og:image") || "";

  // TikTok often puts stats in OG desc: "X Likes, Y Fans. BIO"
  const fansMatch = data.bio.match(/([\d,.]+[KkMm]?)\s*(?:Fans|Followers)/i);
  if (fansMatch) data.followers = parseNumber(fansMatch[1]);

  const likesMatch = data.bio.match(/([\d,.]+[KkMm]?)\s*Likes/i);
  if (likesMatch) data.posts = parseNumber(likesMatch[1]) + " likes";

  // JSON data in script (TikTok embeds __UNIVERSAL_DATA_FOR_REHYDRATION__)
  const jsonMatch = html.match(/"followerCount"\s*:\s*(\d+)/);
  if (jsonMatch) data.followers = parseNumber(jsonMatch[1]);

  const followingMatch = html.match(/"followingCount"\s*:\s*(\d+)/);
  if (followingMatch) data.following = parseNumber(followingMatch[1]);

  data.verified = html.includes('"verified":true') || html.includes("verified-badge");
  return data;
}

function enrichYouTube(html: string): EnrichedData {
  const data = { ...EMPTY_ENRICHED };

  data.fullName = extractMeta(html, "og:title")?.replace(/ - YouTube$/i, "").trim() || "";
  data.bio = extractMeta(html, "og:description") || "";
  data.profileImage = extractMeta(html, "og:image") || "";

  // YouTube channels: "X subscribers"
  const subsMatch = html.match(/"subscriberCountText"\s*:\s*\{[^}]*"simpleText"\s*:\s*"([^"]+)"/);
  if (subsMatch) data.followers = subsMatch[1].replace(/\s*subscribers?/i, "").trim();

  const videoMatch = html.match(/"videoCountText"\s*:\s*\{[^}]*"simpleText"\s*:\s*"([^"]+)"/);
  if (videoMatch) data.posts = videoMatch[1].replace(/\s*videos?/i, "").trim();

  // External links
  const extMatch = html.match(/"primaryLinkUrl"\s*:\s*"([^"]+)"/);
  if (extMatch) data.externalUrl = decodeURIComponent(extMatch[1]);

  data.verified = html.includes('"isVerified":true');
  return data;
}

function enrichTwitter(html: string): EnrichedData {
  const data = { ...EMPTY_ENRICHED };

  // X/Twitter: OG meta typically sparse for logged-out, but we try.
  data.fullName = extractMeta(html, "og:title")?.split(/[(@]/)[0].trim() || "";
  data.bio = extractMeta(html, "og:description") || "";
  data.profileImage = extractMeta(html, "og:image") || "";

  // "X Followers" in the description
  const fMatch = data.bio.match(/([\d,.]+[KkMm]?)\s*Followers/i);
  if (fMatch) data.followers = parseNumber(fMatch[1]);

  const followingMatch = data.bio.match(/([\d,.]+[KkMm]?)\s*Following/i);
  if (followingMatch) data.following = parseNumber(followingMatch[1]);

  return data;
}

function enrichFacebook(html: string): EnrichedData {
  const data = { ...EMPTY_ENRICHED };

  data.fullName = extractMeta(html, "og:title") || "";
  data.bio = extractMeta(html, "og:description") || "";
  data.profileImage = extractMeta(html, "og:image") || "";

  const fMatch = data.bio.match(/([\d,.]+[KkMm]?)\s*(?:followers?|likes?)/i);
  if (fMatch) data.followers = parseNumber(fMatch[1]);

  return data;
}

// ---------------------------------------------------------------------------
// PLATFORM DISPATCHER
// ---------------------------------------------------------------------------

function detectPlatform(url: string): string {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  if (url.includes("facebook.com") || url.includes("fb.com")) return "facebook";
  return "unknown";
}

function enrichFromHtml(html: string, platform: string): EnrichedData {
  switch (platform) {
    case "instagram":
      return enrichInstagram(html);
    case "linkedin":
      return enrichLinkedIn(html);
    case "tiktok":
      return enrichTikTok(html);
    case "youtube":
      return enrichYouTube(html);
    case "twitter":
      return enrichTwitter(html);
    case "facebook":
      return enrichFacebook(html);
    default:
      return { ...EMPTY_ENRICHED, bio: extractMeta(html, "og:description") };
  }
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * Enriches a batch of leads by fetching their profile URLs.
 * Processes in parallel (max concurrency 5) for speed.
 * Returns the same array with enriched fields applied.
 */
export async function enrichLeads(leads: Lead[], maxConcurrency = 5): Promise<Lead[]> {
  const queue = [...leads];
  const results: Lead[] = [];

  async function worker() {
    while (queue.length > 0) {
      const lead = queue.shift();
      if (!lead) break;

      const enriched = await enrichSingleLead(lead);
      results.push(enriched);
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrency, leads.length) }, () => worker());
  await Promise.all(workers);

  // Preserve original order (workers process out of order).
  const map = new Map(results.map((r) => [r.id, r]));
  return leads.map((l) => map.get(l.id) || l);
}

/**
 * Enriches a single lead by visiting its profile URL.
 */
async function enrichSingleLead(lead: Lead): Promise<Lead> {
  if (!lead.profileUrl) return lead;

  const platform = detectPlatform(lead.profileUrl);
  const html = await fetchPage(lead.profileUrl);
  if (!html) return lead;

  const data = enrichFromHtml(html, platform);

  // Apply enriched data to lead (only override if we got better data).
  return {
    ...lead,
    name: data.fullName || lead.name,
    description: data.bio || lead.description,
    followers: data.followers || lead.followers,
    website: data.externalUrl
      ? data.externalUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
      : lead.website,
    // Score boost for enriched data.
    leadScore: Math.min(
      99,
      lead.leadScore +
        (data.followers ? 5 : 0) +
        (data.bio ? 3 : 0) +
        (data.externalUrl ? 4 : 0) +
        (data.verified ? 5 : 0)
    ),
  };
}
