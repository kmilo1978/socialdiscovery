import { NextResponse } from "next/server";
import { activeProvider } from "@/lib/search-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reports which search provider is configured, WITHOUT leaking key values.
export async function GET() {
  const provider = activeProvider();
  return NextResponse.json({
    provider,
    connected: provider !== "none",
    google: {
      hasKey: Boolean(process.env.GOOGLE_CSE_KEY),
      hasCx: Boolean(process.env.GOOGLE_CSE_CX),
    },
    serpapi: {
      hasKey: Boolean(process.env.SERPAPI_KEY),
    },
    // Email validation always works (no key needed)
    emailValidation: true,
  });
}
