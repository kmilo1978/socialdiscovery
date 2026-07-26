import { NextRequest, NextResponse } from "next/server";
import { buildFootprints } from "@/lib/footprints";
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
    const mode: SearchMode = body.mode === "basic" ? "basic" : "api";
    const geoLocation = sanitizeLabel(body.geoLocation, 10) || "";
    const exactMatch = toBool(body.exactMatch);
    const includeSynonyms = toBool(body.includeSynonyms);
    const avoidDuplicates = toBool(body.avoidDuplicates, true);
    const validateEmails = toBool(body.validateEmails);
    const requireEmail = toBool(body.requireEmail, true);
    const enrichResults = toBool(body.enrichResults);

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
      exactMatch,
      includeSynonyms,
      requireEmail,
    });

    // --- API mode with no key configured -> DEMO data ---
    if (mode === "api" && apiProvider() === "none") {
      const { demoLeads } = await import("@/lib/demo-data");
      const leads = demoLeads(keyword, platform, country).slice(0, maxResults);
      return NextResponse.json({
        provider: "demo",
        demo: true,
        mode,
        note: "Demo data. Add GOOGLE_CSE_KEY + GOOGLE_CSE_CX (or SERPAPI_KEY) to .env.local for real API results, or switch to Basic mode.",
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

    // If nothing came back and we hit an error, surface it (scrubbed).
    if (leads.length === 0 && firstError) {
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

    return NextResponse.json({
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
