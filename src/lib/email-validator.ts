// Real email validation: syntax + domain MX records (DNS) + disposable/role detection.
import { Resolver } from "dns/promises";

// Use public DNS resolvers (Google + Cloudflare). Many sandboxed/hosting
// environments block the default system resolver, so we set these explicitly.
const resolver = new Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

const dns = {
  resolveMx: (domain: string) => resolver.resolveMx(domain),
  resolve: (domain: string) => resolver.resolve4(domain),
};

export interface EmailValidationResult {
  email: string;
  status: "accepted" | "limited" | "rejected";
  syntax: boolean;
  domain: boolean;
  mx: boolean;
  disposable: boolean;
  role: boolean;
  catchAll: boolean;
  provider: string;
  confidence: number;
}

// A small set of common disposable email domains.
const DISPOSABLE_DOMAINS = new Set([
  "tempmail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "throwawaymail.com",
  "yopmail.com",
  "temp-mail.org",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
  "maildrop.cc",
  "fakeinbox.com",
  "dispostable.com",
]);

// Role-based local parts (not tied to a person).
const ROLE_ACCOUNTS = new Set([
  "info",
  "admin",
  "support",
  "sales",
  "contact",
  "hello",
  "help",
  "office",
  "team",
  "billing",
  "noreply",
  "no-reply",
  "webmaster",
  "postmaster",
  "abuse",
]);

// Map MX host to a friendly provider name.
function detectProvider(mxHosts: string[]): string {
  const joined = mxHosts.join(" ").toLowerCase();
  if (joined.includes("google") || joined.includes("googlemail")) return "Google Workspace";
  if (joined.includes("outlook") || joined.includes("protection.outlook"))
    return "Microsoft 365";
  if (joined.includes("zoho")) return "Zoho Mail";
  if (joined.includes("protonmail") || joined.includes("proton.me")) return "Proton Mail";
  if (joined.includes("yahoodns") || joined.includes("yahoo")) return "Yahoo";
  if (joined.includes("icloud") || joined.includes("apple")) return "iCloud";
  if (joined.includes("amazonaws") || joined.includes("amazonses")) return "Amazon SES";
  if (joined.includes("mailgun")) return "Mailgun";
  if (joined.includes("sendgrid")) return "SendGrid";
  return mxHosts[0] ? mxHosts[0].replace(/\.$/, "") : "Unknown";
}

const EMAIL_SYNTAX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const trimmed = email.trim().toLowerCase();
  const syntax = EMAIL_SYNTAX.test(trimmed);

  const result: EmailValidationResult = {
    email: trimmed,
    status: "rejected",
    syntax,
    domain: false,
    mx: false,
    disposable: false,
    role: false,
    catchAll: false,
    provider: "Unknown",
    confidence: 0,
  };

  if (!syntax) {
    return result;
  }

  const [localPart, domain] = trimmed.split("@");

  result.disposable = DISPOSABLE_DOMAINS.has(domain);
  result.role = ROLE_ACCOUNTS.has(localPart);

  // DNS: resolve MX records
  let mxHosts: string[] = [];
  try {
    const mx = await dns.resolveMx(domain);
    if (mx && mx.length > 0) {
      result.domain = true;
      result.mx = true;
      mxHosts = mx.sort((a, b) => a.priority - b.priority).map((m) => m.exchange);
      result.provider = detectProvider(mxHosts);
    }
  } catch {
    // No MX — try A record to see if domain at least exists
    try {
      await dns.resolve(domain);
      result.domain = true;
      result.mx = false;
    } catch {
      result.domain = false;
      result.mx = false;
    }
  }

  // Confidence scoring
  let confidence = 0;
  if (result.syntax) confidence += 20;
  if (result.domain) confidence += 20;
  if (result.mx) confidence += 40;
  if (!result.disposable) confidence += 10;
  if (!result.role) confidence += 10;
  result.confidence = confidence;

  // Status determination
  if (!result.mx || result.disposable) {
    result.status = "rejected";
  } else if (result.role || confidence < 80) {
    result.status = "limited";
  } else {
    result.status = "accepted";
  }

  return result;
}
