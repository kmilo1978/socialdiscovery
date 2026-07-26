// Security layer: input sanitization (anti-injection), validation,
// rate limiting, and secret scrubbing (prevents API key extraction/leakage).

// ---------------------------------------------------------------------------
// 1) SECRET SCRUBBING — ensures API keys never reach the client, even in errors
// ---------------------------------------------------------------------------

/** Collects the current secret values from the environment. */
function currentSecrets(): string[] {
  return [process.env.GOOGLE_CSE_KEY, process.env.GOOGLE_CSE_CX, process.env.SERPAPI_KEY]
    .filter((v): v is string => typeof v === "string" && v.length >= 6);
}

/**
 * Removes any secret value (and key-looking tokens) from a string before it is
 * ever returned to the client or logged. Defends against accidental key leaks.
 */
export function scrubSecrets(input: string): string {
  let out = input;
  for (const secret of currentSecrets()) {
    out = out.split(secret).join("[REDACTED]");
  }
  // Also redact common API-key patterns and query params that could carry keys.
  out = out
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, "[REDACTED]") // Google API keys
    .replace(/([?&](?:key|api_key|cx)=)[^&\s]+/gi, "$1[REDACTED]"); // key in URLs
  return out;
}

/** Returns a client-safe error message (generic + scrubbed). */
export function safeErrorMessage(err: unknown, fallback = "Request failed"): string {
  const raw = err instanceof Error ? err.message : String(err ?? fallback);
  return scrubSecrets(raw).slice(0, 300);
}

// ---------------------------------------------------------------------------
// 2) INPUT SANITIZATION — anti-injection for the search keyword and fields
// ---------------------------------------------------------------------------

const MAX_KEYWORD_LEN = 120;

/**
 * Sanitizes a free-text keyword before it is embedded into a search query.
 * - strips control chars and newlines (prevents query/header injection)
 * - removes characters that could break out of the quoted dork term
 *   or inject extra operators (", \, <, >, backticks, etc.)
 * - collapses whitespace and caps length
 */
export function sanitizeKeyword(input: unknown): string {
  if (typeof input !== "string") return "";
  let s = input.normalize("NFKC");
  // Remove control characters (incl. newlines, tabs, null bytes)
  s = s.replace(/[\u0000-\u001F\u007F]/g, " ");
  // Remove characters used to break out of a quoted term or inject operators
  s = s.replace(/["'`\\<>{}();]/g, " ");
  // Strip search-operator prefixes a user might inject (site:, inurl:, etc.)
  s = s.replace(/\b(site|inurl|intitle|intext|filetype|cache|related|link|allintext)\s*:/gi, " ");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, MAX_KEYWORD_LEN);
}

/** Sanitizes a short label value (country, etc.) — alphanumerics + a few marks. */
export function sanitizeLabel(input: unknown, max = 60): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[^\p{L}\p{N}\s().,\-—]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Clamps a number into a range, with a fallback for invalid input. */
export function clampNumber(input: unknown, min: number, max: number, fallback: number): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}

/** Coerces any value to a strict boolean. */
export function toBool(input: unknown, fallback = false): boolean {
  if (typeof input === "boolean") return input;
  if (input === "true") return true;
  if (input === "false") return false;
  return fallback;
}

// Whitelist of allowed platform identifiers (prevents arbitrary values).
export const ALLOWED_PLATFORMS = new Set([
  "instagram-keyword",
  "instagram-hashtag",
  "twitter-keyword",
  "twitter-followers",
  "twitter-following",
  "facebook-keyword",
  "linkedin-keyword",
  "youtube-keyword",
  "tiktok-keyword",
  "multiple-channels",
]);

export function sanitizePlatform(input: unknown): string {
  return typeof input === "string" && ALLOWED_PLATFORMS.has(input) ? input : "linkedin-keyword";
}

/** Basic email shape + length guard (anti-injection for the validator route). */
export function sanitizeEmail(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .replace(/[\u0000-\u001F\u007F\s]/g, "")
    .slice(0, 254); // RFC max email length
}

// ---------------------------------------------------------------------------
// 3) RATE LIMITING — in-memory sliding window per client (anti-abuse / anti-DoS)
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
}

/**
 * Fixed-window rate limiter. Returns whether the request is allowed.
 * @param id      unique caller id (e.g. IP + route)
 * @param limit   max requests per window
 * @param windowMs window size in ms
 */
export function rateLimit(id: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(id);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0, limit };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      limit,
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterSec: 0, limit };
}

/** Extracts a best-effort client identifier from request headers. */
export function clientId(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : "") || h.get("x-real-ip") || "local";
  return ip.trim();
}

// Periodically clear expired buckets to avoid unbounded growth.
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { __rlSweep?: boolean };
  if (!g.__rlSweep) {
    g.__rlSweep = true;
    setInterval(() => {
      const now = Date.now();
      for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
    }, 60_000).unref?.();
  }
}
