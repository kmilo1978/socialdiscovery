// Footprint (Google dork) query builder.
// Builds advanced Google search queries to find public social profiles.

export type Platform =
  | "instagram-keyword"
  | "instagram-hashtag"
  | "twitter-keyword"
  | "twitter-followers"
  | "twitter-following"
  | "facebook-keyword"
  | "linkedin-keyword"
  | "youtube-keyword"
  | "tiktok-keyword"
  | "multiple-channels";

// Common free email providers used to force profiles that expose a contact email.
const EMAIL_PROVIDERS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
];

// site: operators per platform.
const PLATFORM_SITES: Record<string, string[]> = {
  "instagram-keyword": ["instagram.com"],
  "instagram-hashtag": ["instagram.com/explore/tags"],
  "twitter-keyword": ["twitter.com", "x.com"],
  "twitter-followers": ["twitter.com", "x.com"],
  "twitter-following": ["twitter.com", "x.com"],
  "facebook-keyword": ["facebook.com"],
  "linkedin-keyword": ["linkedin.com/in", "linkedin.com/company"],
  "youtube-keyword": ["youtube.com/@", "youtube.com/c", "youtube.com/channel"],
  "tiktok-keyword": ["tiktok.com/@"],
};

export interface FootprintOptions {
  platform: string;
  keyword: string;
  country?: string;
  exactMatch?: boolean;
  includeSynonyms?: boolean;
  requireEmail?: boolean; // force results that expose an email
}

export interface BuiltQuery {
  query: string;
  site: string;
  platform: string;
}

// Simple keyword synonym expansion (very small demo dictionary; extend as needed).
const SYNONYMS: Record<string, string[]> = {
  founder: ["founder", "co-founder", "ceo", "entrepreneur"],
  developer: ["developer", "engineer", "programmer"],
  marketing: ["marketing", "growth", "cmo"],
  designer: ["designer", "ux", "ui"],
};

function expandSynonyms(keyword: string): string {
  const lower = keyword.toLowerCase().trim();
  for (const [key, syns] of Object.entries(SYNONYMS)) {
    if (lower.includes(key)) {
      return `(${syns.map((s) => `"${s}"`).join(" OR ")})`;
    }
  }
  return `"${keyword}"`;
}

/**
 * Builds one or more Google footprint queries for a given platform/keyword.
 * Each platform site generates its own query so we can spread requests.
 */
export function buildFootprints(opts: FootprintOptions): BuiltQuery[] {
  const { platform, keyword } = opts;
  const sites =
    platform === "multiple-channels"
      ? Object.values(PLATFORM_SITES).flat()
      : PLATFORM_SITES[platform] || ["linkedin.com/in"];

  // Keyword term
  let keywordTerm: string;
  if (opts.exactMatch) {
    keywordTerm = `"${keyword}"`;
  } else if (opts.includeSynonyms) {
    keywordTerm = expandSynonyms(keyword);
  } else {
    keywordTerm = keyword.includes(" ") ? `"${keyword}"` : keyword;
  }

  // Country term
  const countryTerm =
    opts.country && opts.country !== "All Countries" && !opts.country.startsWith("—")
      ? ` "${opts.country}"`
      : "";

  // Email requirement (footprint that forces an exposed contact email)
  const emailTerm = opts.requireEmail
    ? ` (${EMAIL_PROVIDERS.map((p) => `"@${p}"`).join(" OR ")})`
    : "";

  // Hashtag handling
  const hashtagTerm =
    platform === "instagram-hashtag" ? `` : "";

  return sites.map((site) => ({
    site,
    platform,
    query: `site:${site} ${keywordTerm}${countryTerm}${emailTerm}${hashtagTerm}`.trim(),
  }));
}

export function platformLabel(platform: string): string {
  if (platform.startsWith("instagram")) return "Instagram";
  if (platform.startsWith("twitter")) return "X (Twitter)";
  if (platform.startsWith("facebook")) return "Facebook";
  if (platform.startsWith("linkedin")) return "LinkedIn";
  if (platform.startsWith("youtube")) return "YouTube";
  if (platform.startsWith("tiktok")) return "TikTok";
  return "Web";
}

export function platformFromUrl(url: string): string {
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("twitter.com") || url.includes("x.com")) return "X (Twitter)";
  if (url.includes("facebook.com")) return "Facebook";
  if (url.includes("linkedin.com")) return "LinkedIn";
  if (url.includes("youtube.com")) return "YouTube";
  if (url.includes("tiktok.com")) return "TikTok";
  return "Web";
}
