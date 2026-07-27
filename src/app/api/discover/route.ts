import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { buildFootprints, searchTypeCode } from "@/lib/footprints";
import {
  runSearch,
  providerForMode,
  apiProvider,
  MODE_LIMITS,
  type SearchMode,
} from "@/lib/search-providers";
import { extractLeads } from "@/lib/extractors";
import {
  sanitizeKeyword,
  sanitizeLabel,
  sanitizePlatform,
  clampNumber,
  toBool,
  rateLimit,
  clientId,
  safeErrorMessage,
} from "@/lib/security";
import { saveSearch } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

// Rate limit: max 20 discovery searches per minute per client.
const RL_LIMIT = 20;
const RL_WINDOW = 60_000;

export async function POST(req: NextRequest) {
  // --- Rate limiting (anti-abuse) ---
  const rl = rateLimit(`discover:${clientId(req)}`, RL_LIMIT, RL_WINDOW);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    // --- Parse + validate body defensively ---
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const platform = sanitizePlatform(body.platform);
    const keyword = sanitizeKeyword(body.keyword);
    const country = sanitizeLabel(body.country) || "All Countries";
    const city = sanitizeLabel(body.city, 60) || "";
    const mode: SearchMode = body.mode === "basic" ? "basic" : "api";
    const geoLocation = sanitizeLabel(body.geoLocation, 10) || "";
    const exactMatch = toBool(body.exactMatch);
    const includeSynonyms = toBool(body.includeSynonyms);
    const avoidDuplicates = toBool(body.avoidDuplicates, true);
    const validateEmails = toBool(body.validateEmails);
    const requireEmail = toBool(body.requireEmail, true);
    const enrichResults = toBool(body.enrichResults);
    const gmbHasWebsite = typeof body.gmbHasWebsite === "string" ? body.gmbHasWebsite : "any";
    const gmbHasPhone = typeof body.gmbHasPhone === "string" ? body.gmbHasPhone : "any";

    // Clamp maxResults to the selected mode's ceiling (anti-abuse / cost control).
    const modeCap = MODE_LIMITS[mode].maxResults;
    const maxResults = clampNumber(body.maxResults, 10, modeCap, Math.min(30, modeCap));

    if (!keyword || keyword.length < 2) {
      return NextResponse.json(
        { error: "Keyword is required (min 2 valid characters)." },
        { status: 400 }
      );
    }

    const provider = providerForMode(mode);

    // Build footprint queries (keyword already sanitized).
    const footprints = buildFootprints({
      platform,
      keyword,
      country,
      city,
      exactMatch,
      includeSynonyms,
      requireEmail,
    });

    const searchType = searchTypeCode(platform);

    // --- API mode with no key configured -> DEMO data ---
    if (mode === "api" && apiProvider() === "none") {
      const { demoLeads } = await import("@/lib/demo-data");
      const leads = demoLeads(keyword, platform, country).slice(0, maxResults);

      const searchId = randomUUID();
      try {
        saveSearch({
          id: searchId,
          platform,
          keyword,
          country,
          geoLocation,
          mode,
          provider: "demo",
          searchType,
          status: "completed",
          leads,
          creditsUsed: 0, // demo data costs nothing
        });
      } catch (e) {
        console.error("DB save (demo) failed:", e);
      }

      return NextResponse.json({
        searchId,
        provider: "demo",
        demo: true,
        mode,
        note: "Demo data. Add SERPAPI_KEY to .env.local for real API results, or switch to Basic mode.",
        queries: footprints.map((f) => f.query),
        total: leads.length,
        rawCount: leads.length,
        leads,
      });
    }

    // Pages per query (basic mode = 1 page only).
    const pagesNeeded = mode === "basic" ? 1 : Math.min(Math.ceil(maxResults / 10), 5);

    const rawAll = [];
    const usedQueries: string[] = [];
    let firstError: string | null = null;

    for (const fp of footprints) {
      usedQueries.push(fp.query);
      for (let page = 0; page < pagesNeeded; page++) {
        try {
          const results = await runSearch(fp.query, page, mode, geoLocation);
          rawAll.push(...results);
          if (results.length < 10) break;
        } catch (err) {
          if (!firstError) firstError = safeErrorMessage(err, "Search provider error");
          break;
        }
        if (rawAll.length >= maxResults) break;
      }
      if (rawAll.length >= maxResults) break;
    }

    let leads = extractLeads(rawAll, country, { avoidDuplicates });
    leads = leads.slice(0, maxResults);

    // GMB-specific post-filters (website / phone presence).
    if (platform === "gmb-keyword") {
      if (gmbHasWebsite === "yes") {
        leads = leads.filter((l) => l.website && l.website !== "—");
      } else if (gmbHasWebsite === "no") {
        leads = leads.filter((l) => !l.website || l.website === "—");
      }
      if (gmbHasPhone === "yes") {
        leads = leads.filter((l) => l.phone && l.phone !== "—");
      } else if (gmbHasPhone === "no") {
        leads = leads.filter((l) => !l.phone || l.phone === "—");
      }
    }

    // General post-filter: with/without email (applies to all platforms).
    const filterEmail = typeof body.filterEmail === "string" ? body.filterEmail : "any";
    if (filterEmail === "yes") {
      leads = leads.filter((l) => l.email && l.email !== "—");
    } else if (filterEmail === "no") {
      leads = leads.filter((l) => !l.email || l.email === "—");
    }

    // If nothing came back and we hit an error, surface it (scrubbed).
    if (leads.length === 0 && firstError) {
      try {
        saveSearch({
          id: randomUUID(),
          platform,
          keyword,
          country,
          geoLocation,
          mode,
          provider,
          searchType,
          status: "failed",
          leads: [],
          creditsUsed: 0,
          error: firstError,
        });
      } catch (e) {
        console.error("DB save (failed search) error:", e);
      }
      return NextResponse.json({ error: firstError, provider, mode }, { status: 502 });
    }

    // Optional inline email validation (real MX check).
    if (validateEmails) {
      const { validateEmail } = await import("@/lib/email-validator");
      await Promise.all(
        leads.map(async (lead) => {
          if (lead.email && lead.email !== "—") {
            const result = await validateEmail(lead.email);
            lead.status =
              result.status === "accepted"
                ? "verified"
                : result.status === "limited"
                ? "pending"
                : "unverified";
          }
        })
      );
    }

    // Optional URL enrichment (visits each profile to get bio, followers, etc.)
    if (enrichResults && leads.length > 0) {
      const { enrichLeads } = await import("@/lib/enrichment");
      leads = await enrichLeads(leads, 5); // max 5 concurrent fetches
    }

    // Credits model: 1 credit per result, +1 per validated email (rough estimate).
    const creditsUsed = leads.length + (validateEmails ? leads.length : 0);

    const searchId = randomUUID();
    try {
      saveSearch({
        id: searchId,
        platform,
        keyword,
        country,
        geoLocation,
        mode,
        provider,
        searchType,
        status: "completed",
        leads,
        creditsUsed,
      });
    } catch (e) {
      console.error("DB save (search) failed:", e);
    }

    return NextResponse.json({
      searchId,
      provider,
      mode,
      enriched: enrichResults,
      queries: usedQueries,
      total: leads.length,
      rawCount: rawAll.length,
      leads,
    });
  } catch (err) {
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
