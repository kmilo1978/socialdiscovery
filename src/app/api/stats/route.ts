import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/db";
import { safeErrorMessage } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dashboard aggregate stats, computed from real search/validation history.
export async function GET() {
  try {
    const stats = getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
