import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/email-validator";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, emails } = body;

    // Bulk mode
    if (Array.isArray(emails)) {
      const capped = emails.slice(0, 500);
      const results = await Promise.all(
        capped.map((e: string) => validateEmail(String(e)))
      );
      return NextResponse.json({ results });
    }

    // Single mode
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const result = await validateEmail(email);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
