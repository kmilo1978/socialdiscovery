import { NextRequest, NextResponse } from "next/server";
import { buildFootprints } from "@/lib/footprints";
import { runSearch, activeProvider } from "@/lib/search-providers";
import { extractLeads } from "@/lib/extractors";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      platform = "linkedin-keyword",
      keyword = "",
      country = "All Countries",
      maxResults = 50,
      exactMatch = false,
      includeSynonyms = false,
      avoidDuplicates = true,
      validateEmails = false,
      requireEmail = true,
    } = body;

    if (!keyword || keyword.trim().length < 2) {
      return NextResponse.json(
        { error: "Keyword is required (min 2 characters)." },
        { status: 400 }
      );
    }

    const provider = activeProvider();

    // Build footprint queries
    const footprints = buildFootprints({
      platform,
      keyword,
      country,
      exactMatch,
      includeSynonyms,
      requireEmail,
    });

    if (provider === "none") {
      // No API key configured -> return DEMO data so the UI is testable.
      const { demoLeads } = await import("@/lib/demo-data");
      const leads = demoLeads(keyword, platform, country).slice(0, maxResults);
      return NextResponse.json({
        provider: "demo",
        demo: true,
        note: "Demo data. Add GOOGLE_CSE_KEY + GOOGLE_CSE_CX (or SERPAPI_KEY) to .env.local for real Google footprint results. See README.",
        queries: footprints.map((f) => f.query),
        total: leads.length,
        rawCount: leads.length,
        leads,
      });
    }

    // How many result pages to fetch (each page ~= 10 results)
    const pagesNeeded = Math.min(Math.ceil(maxResults / 10), 5);

    const rawAll = [];
    const usedQueries: string[] = [];

    // Spread requested pages across footprint queries
    for (const fp of footprints) {
      usedQueries.push(fp.query);
      for (let page = 0; page < pagesNeeded; page++) {
        try {
          const results = await runSearch(fp.query, page);
          rawAll.push(...results);
          if (results.length < 10) break; // no more pages
        } catch (err) {
          // Continue with whatever we have; surface first error only
          console.error("Search error:", err);
          break;
        }
        if (rawAll.length >= maxResults) break;
      }
      if (rawAll.length >= maxResults) break;
    }

    let leads = extractLeads(rawAll, country, { avoidDuplicates });
    leads = leads.slice(0, maxResults);

    // Optionally validate emails inline (real MX check)
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

    return NextResponse.json({
      provider,
      queries: usedQueries,
      total: leads.length,
      rawCount: rawAll.length,
      leads,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
