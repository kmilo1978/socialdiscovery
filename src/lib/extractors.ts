// Extracts structured lead data from raw search results.

import type { RawResult } from "./search-providers";
import { platformFromUrl } from "./footprints";

export interface Lead {
  id: string;
  avatar: string;
  platform: string;
  name: string;
  description: string;
  username: string;
  website: string;
  email: string;
  phone: string;
  followers: string;
  country: string;
  status: "verified" | "pending" | "unverified";
  leadScore: number;
  profileUrl: string;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// International-ish phone: +country and 7-14 digits with separators
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g;

function extractEmail(text: string): string {
  const matches = text.match(EMAIL_REGEX);
  if (!matches) return "";
  // Filter out image/asset-looking false positives
  const clean = matches.find(
    (m) => !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(m) && m.length < 60
  );
  return clean || "";
}

function extractPhone(text: string): string {
  const matches = text.match(PHONE_REGEX);
  if (!matches) return "";
  const candidate = matches
    .map((m) => m.trim())
    .find((m) => m.replace(/\D/g, "").length >= 8 && m.replace(/\D/g, "").length <= 15);
  return candidate || "";
}

function extractUsername(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    // instagram.com/username , twitter.com/username , tiktok.com/@username
    if (u.hostname.includes("linkedin.com")) {
      const idx = parts.indexOf("in");
      if (idx >= 0 && parts[idx + 1]) return `@${parts[idx + 1]}`;
    }
    const first = parts[0] || "";
    if (first.startsWith("@")) return first;
    if (first && !["explore", "channel", "c", "company"].includes(first)) {
      return `@${first}`;
    }
    return "";
  } catch {
    return "";
  }
}

function extractName(title: string): string {
  // Google titles often look like "John Doe - Marketing Manager | LinkedIn"
  // or "John Doe (@johndoe) • Instagram photos"
  let name = title
    .split(/[|•·\-–—(]/)[0]
    .replace(/on (Instagram|Twitter|X|TikTok|Facebook|LinkedIn|YouTube)/i, "")
    .trim();
  // Strip trailing platform words
  name = name.replace(/\b(Instagram|Twitter|LinkedIn|Facebook|TikTok|YouTube|Profiles?)\b/gi, "").trim();
  return name || title.slice(0, 40);
}

function extractWebsite(text: string, profileUrl: string): string {
  // Look for a non-social domain in the snippet
  const urlRegex = /https?:\/\/[^\s"'<>]+/g;
  const matches = text.match(urlRegex) || [];
  const social = /(instagram|twitter|x\.com|facebook|linkedin|tiktok|youtube|google|gstatic)/i;
  const external = matches.find((m) => !social.test(m));
  if (external) {
    try {
      return new URL(external).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }
  return "";
}

function scoreLead(lead: Partial<Lead>): number {
  let score = 40;
  if (lead.email) score += 30;
  if (lead.phone) score += 12;
  if (lead.website) score += 8;
  if (lead.name && lead.name.split(" ").length >= 2) score += 6;
  if (lead.username) score += 4;
  return Math.min(score, 99);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || "??").toUpperCase();
}

export function extractLeads(
  results: RawResult[],
  country: string,
  opts: { avoidDuplicates?: boolean } = {}
): Lead[] {
  const seen = new Set<string>();
  const leads: Lead[] = [];

  for (const r of results) {
    if (!r.link) continue;

    const text = `${r.title} ${r.snippet}`;
    const email = extractEmail(text);
    const phone = extractPhone(r.snippet);
    const username = extractUsername(r.link);
    const name = extractName(r.title);
    const website = extractWebsite(r.snippet, r.link);
    const platform = platformFromUrl(r.link);
    // Description = the caption/snippet text (what SocLeads shows in the "Name" column)
    const description = (r.snippet || r.title || "").trim();

    // Dedup key
    const key = (email || username || r.link).toLowerCase();
    if (opts.avoidDuplicates && seen.has(key)) continue;
    seen.add(key);

    const partial: Partial<Lead> = { email, phone, website, name, username };

    leads.push({
      id: key,
      avatar: initials(name),
      platform,
      name,
      description: description || "—",
      username: username || "—",
      website: website || "—",
      email: email || "—",
      phone: phone || "—",
      followers: "—", // not available from search snippets
      country: country && country !== "All Countries" && !country.startsWith("—") ? country : "—",
      status: email ? "pending" : "unverified",
      leadScore: scoreLead(partial),
      profileUrl: r.link,
    });
  }

  return leads;
}
