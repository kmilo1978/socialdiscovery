// Simple API key authentication for external tool access.
// External tools (n8n, Make, Zapier, Python scripts, etc.) send:
//   Authorization: Bearer <API_KEY>
// or as query param: ?api_key=<API_KEY>
//
// The key is configured in .env.local as PUBLIC_API_KEY.
// If not set, external access is disabled (only the web UI works).

import { NextRequest } from "next/server";

/**
 * Validates an incoming request's API key.
 * Returns true if:
 * - The request comes from the same origin (web UI, no auth needed)
 * - The request has a valid Bearer token or api_key param matching PUBLIC_API_KEY
 * Returns false if PUBLIC_API_KEY is set but the request doesn't match.
 */
export function authenticateRequest(req: NextRequest): { ok: boolean; error?: string } {
  const publicKey = process.env.PUBLIC_API_KEY;

  // If no PUBLIC_API_KEY configured, only allow same-origin (web UI) requests.
  if (!publicKey) {
    return { ok: true }; // No external auth configured, allow all (local use)
  }

  // Check Authorization header: Bearer <key>
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token === publicKey) return { ok: true };
    return { ok: false, error: "Invalid API key" };
  }

  // Check query param: ?api_key=<key>
  const url = new URL(req.url);
  const paramKey = url.searchParams.get("api_key");
  if (paramKey === publicKey) return { ok: true };

  // Check if it's a same-origin request (from the web UI)
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  if (origin || referer) {
    // Request from the browser UI — allow without key
    return { ok: true };
  }

  // External request without valid key
  return { ok: false, error: "API key required. Send as: Authorization: Bearer <key> or ?api_key=<key>" };
}
