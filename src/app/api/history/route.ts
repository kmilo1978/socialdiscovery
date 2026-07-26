import { NextRequest, NextResponse } from "next/server";
import { listSearches, getLeadsForSearch, listValidations } from "@/lib/db";
import { clampNumber, safeErrorMessage } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/history            -> recent searches (Search History page)
// GET /api/history?searchId=X -> leads for one search (re-open past results)
// GET /api/history?type=validations -> recent email validations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const searchId = searchParams.get("searchId");
    const type = searchParams.get("type");
    const limit = clampNumber(searchParams.get("limit"), 1, 200, 50);

    if (searchId) {
      const leads = getLeadsForSearch(searchId);
      return NextResponse.json({ searchId, leads, total: leads.length });
    }

    if (type === "validations") {
      const validations = listValidations(limit);
      return NextResponse.json({ validations, total: validations.length });
    }

    const searches = listSearches(limit);
    return NextResponse.json({ searches, total: searches.length });
  } catch (err) {
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
