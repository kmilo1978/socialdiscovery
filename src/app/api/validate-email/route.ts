import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/email-validator";
import { sanitizeEmail, rateLimit, clientId, safeErrorMessage } from "@/lib/security";

export const runtime = "nodejs";

// Rate limit: max 60 validations per minute per client.
const RL_LIMIT = 60;
const RL_WINDOW = 60_000;
const MAX_BULK = 500;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`validate:${clientId(req)}`, RL_LIMIT, RL_WINDOW);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // Bulk mode
    if (Array.isArray(body.emails)) {
      const capped = (body.emails as unknown[])
        .slice(0, MAX_BULK)
        .map((e) => sanitizeEmail(e))
        .filter((e) => e.length > 0);
      const results = await Promise.all(capped.map((e) => validateEmail(e)));
      return NextResponse.json({ results, count: results.length });
    }

    // Single mode
    const email = sanitizeEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const result = await validateEmail(email);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 500 });
  }
}
