import { NextResponse } from "next/server";
import { activeProvider } from "@/lib/search-providers";
import { getApiUsage } from "@/lib/db";
import { safeErrorMessage } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Free-tier quota SerpAPI grants by default. Update this if you upgrade plans
// (see /api-access in the app for the upgrade link) — it's only used to render
// a usage bar, not enforced server-side (SerpAPI enforces the real limit).
const SERPAPI_FREE_TIER_MONTHLY = 100;

// Reports which search provider is configured, WITHOUT leaking key values.
export async function GET() {
  const provider = activeProvider();
  let usage = { monthlyApiSearches: 0, todayApiSearches: 0, lifetimeApiSearches: 0 };
  try {
    usage = getApiUsage();
  } catch (err) {
    console.error("getApiUsage failed:", safeErrorMessage(err));
  }

  return NextResponse.json({
    provider,
    connected: provider !== "none",
    serpapi: {
      hasKey: Boolean(process.env.SERPAPI_KEY),
      monthlyFreeQuota: SERPAPI_FREE_TIER_MONTHLY,
      usage,
    },
    // Email validation always works (no key needed)
    emailValidation: true,
  });
}
