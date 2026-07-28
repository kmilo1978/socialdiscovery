#!/usr/bin/env node
// =============================================================================
// Social Discovery Engine — MCP Server v2
// Exposes discovery, Google Maps search, and email validation as tools
// via JSON-RPC over stdio (Model Context Protocol).
// Compatible with Claude Desktop, Kiro, and any MCP-compliant client.
//
// Run: node --experimental-strip-types mcp-server.mjs
// Config: see .kiro/settings/mcp.json or mcp-config.json
// =============================================================================

import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { config } from "dotenv";

// Load .env.local so SERPAPI_KEY is available.
config({ path: resolve(process.cwd(), ".env.local") });

// Dynamically import the app's lib modules.
const { buildFootprints, searchTypeCode } = await import("./src/lib/footprints.ts");
const { runSearch, apiProvider, MODE_LIMITS } = await import("./src/lib/search-providers.ts");
const { extractLeads } = await import("./src/lib/extractors.ts");
const { validateEmail } = await import("./src/lib/email-validator.ts");
const { sanitizeKeyword, sanitizeLabel, clampNumber, toBool } = await import("./src/lib/security.ts");

// ---------------------------------------------------------------------------
// MCP Protocol
// ---------------------------------------------------------------------------

const SERVER_INFO = {
  name: "social-discovery-engine",
  version: "2.0.0",
};

const TOOLS = [
  {
    name: "discover",
    description:
      "Search for public social media profiles using Google footprints. " +
      "Finds emails, usernames, phone numbers from Instagram, LinkedIn, X, Facebook, YouTube, TikTok. " +
      "Supports geolocation and city-level targeting.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Platform to search",
          enum: [
            "instagram-keyword", "instagram-hashtag",
            "twitter-keyword", "twitter-followers", "twitter-following",
            "facebook-keyword", "linkedin-keyword",
            "youtube-keyword", "tiktok-keyword", "multiple-channels",
          ],
        },
        keyword: { type: "string", description: "Search keyword (e.g. 'marketing manager', 'plumber')" },
        country: { type: "string", description: "Country filter (e.g. 'Colombia', 'United States')" },
        city: { type: "string", description: "Optional city for local targeting (e.g. 'Bogota', 'New York')" },
        geoLocation: { type: "string", description: "ISO country code for search geolocation (e.g. 'co', 'us')" },
        mode: { type: "string", enum: ["basic", "api"], description: "basic = free (DDG+Bing, max 40), api = SerpAPI (max 250)" },
        maxResults: { type: "number", description: "Maximum results (10-250 for api, 10-40 for basic)" },
        requireEmail: { type: "boolean", description: "Only find profiles that expose an email" },
        validateEmails: { type: "boolean", description: "Run real DNS/MX validation on found emails" },
      },
      required: ["platform", "keyword"],
    },
  },
  {
    name: "search_google_maps",
    description:
      "Search Google Maps for local businesses. Returns business name, phone, website, address, and rating. " +
      "Perfect for finding local leads (plumbers, restaurants, agencies, etc.) in a specific city.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Business type or keyword (e.g. 'plumber', 'restaurant', 'marketing agency')" },
        city: { type: "string", description: "City to search in (e.g. 'Bogota', 'Miami')" },
        country: { type: "string", description: "Country (e.g. 'Colombia', 'United States')" },
        geoLocation: { type: "string", description: "ISO country code (e.g. 'co', 'us')" },
        filterWebsite: { type: "string", enum: ["any", "yes", "no"], description: "Filter: any, has website (yes), or no website (no)" },
        filterPhone: { type: "string", enum: ["any", "yes", "no"], description: "Filter: any, has phone (yes), or no phone (no)" },
      },
      required: ["keyword"],
    },
  },
  {
    name: "validate_email",
    description:
      "Validate an email address with real DNS/MX record checks. " +
      "Returns status (accepted/limited/rejected), provider (Google Workspace, Microsoft 365, etc.), " +
      "disposable check, role account detection, and confidence score (0-100%).",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to validate" },
      },
      required: ["email"],
    },
  },
  {
    name: "validate_emails_bulk",
    description:
      "Validate multiple email addresses at once (max 50). Returns status for each.",
    inputSchema: {
      type: "object",
      properties: {
        emails: {
          type: "array",
          items: { type: "string" },
          description: "Array of email addresses to validate (max 50)",
        },
      },
      required: ["emails"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

async function handleDiscover(args) {
  const platform = args.platform || "linkedin-keyword";
  const keyword = sanitizeKeyword(args.keyword);
  const country = sanitizeLabel(args.country) || "Colombia";
  const city = sanitizeLabel(args.city, 60) || "";
  const geoLocation = sanitizeLabel(args.geoLocation, 10) || "co";
  const mode = args.mode === "basic" ? "basic" : "api";
  const cap = MODE_LIMITS[mode].maxResults;
  const maxResults = clampNumber(args.maxResults, 10, cap, 20);
  const requireEmail = toBool(args.requireEmail, true);
  const validateEmails = toBool(args.validateEmails, false);

  if (!keyword || keyword.length < 2) {
    return { isError: true, content: [{ type: "text", text: "Keyword is required (min 2 characters)." }] };
  }

  const provider = mode === "api" ? apiProvider() : "basic_multi";
  if (mode === "api" && provider === "none") {
    return {
      isError: true,
      content: [{ type: "text", text: "API mode requires SERPAPI_KEY in .env.local. Use mode='basic' instead." }],
    };
  }

  const footprints = buildFootprints({ platform, keyword, country, city, requireEmail, exactMatch: false, includeSynonyms: true });
  const pagesNeeded = mode === "basic" ? 1 : Math.min(Math.ceil(maxResults / 10), 10);

  const rawAll = [];
  const usedQueries = [];

  for (const fp of footprints) {
    usedQueries.push(fp.query);
    for (let page = 0; page < pagesNeeded; page++) {
      try {
        const results = await runSearch(fp.query, page, mode, geoLocation, platform);
        rawAll.push(...results);
        if (results.length < 10) break;
      } catch {
        break;
      }
      if (rawAll.length >= maxResults) break;
    }
    if (rawAll.length >= maxResults) break;
  }

  let leads = extractLeads(rawAll, country, { avoidDuplicates: true });
  leads = leads.slice(0, maxResults);

  if (validateEmails) {
    await Promise.all(
      leads.map(async (lead) => {
        if (lead.email && lead.email !== "—") {
          const r = await validateEmail(lead.email);
          lead.status = r.status === "accepted" ? "verified" : r.status === "limited" ? "pending" : "unverified";
        }
      })
    );
  }

  const emailCount = leads.filter((l) => l.email && l.email !== "—").length;
  const table = leads
    .map((l) => `• ${l.email !== "—" ? l.email : "(no email)"} | ${l.name} | ${l.phone !== "—" ? l.phone : ""} | ${l.website !== "—" ? l.website : ""} | ${l.profileUrl}`)
    .join("\n");

  return {
    content: [
      { type: "text", text: `Found ${leads.length} profiles (${emailCount} with email) via ${provider}.\n\nQuery: ${usedQueries[0]}\n\nResults:\n${table}` },
    ],
  };
}

async function handleSearchGoogleMaps(args) {
  const keyword = sanitizeKeyword(args.keyword);
  const city = sanitizeLabel(args.city, 60) || "";
  const country = sanitizeLabel(args.country) || "Colombia";
  const geoLocation = sanitizeLabel(args.geoLocation, 10) || "co";
  const filterWebsite = args.filterWebsite || "any";
  const filterPhone = args.filterPhone || "any";

  if (!keyword || keyword.length < 2) {
    return { isError: true, content: [{ type: "text", text: "Keyword is required (min 2 characters)." }] };
  }

  if (apiProvider() === "none") {
    return { isError: true, content: [{ type: "text", text: "SERPAPI_KEY required for Google Maps search." }] };
  }

  const query = [keyword, city, country].filter(Boolean).join(" ");
  const results = await runSearch(query, 0, "api", geoLocation, "gmb-keyword");
  let leads = extractLeads(results, country, { avoidDuplicates: true });

  // Apply filters
  if (filterWebsite === "yes") leads = leads.filter((l) => l.website && l.website !== "—");
  if (filterWebsite === "no") leads = leads.filter((l) => !l.website || l.website === "—");
  if (filterPhone === "yes") leads = leads.filter((l) => l.phone && l.phone !== "—");
  if (filterPhone === "no") leads = leads.filter((l) => !l.phone || l.phone === "—");

  const withWebsite = leads.filter((l) => l.website && l.website !== "—").length;
  const withPhone = leads.filter((l) => l.phone && l.phone !== "—").length;

  const table = leads
    .map((l) => `• ${l.name} | ${l.phone !== "—" ? l.phone : "no phone"} | ${l.website !== "—" ? l.website : "no website"} | ${l.profileUrl}`)
    .join("\n");

  return {
    content: [
      { type: "text", text: `Google Maps: "${query}" — ${leads.length} businesses found (${withPhone} with phone, ${withWebsite} with website).\n\nResults:\n${table}` },
    ],
  };
}

async function handleValidateEmail(args) {
  const email = (args.email || "").trim().toLowerCase().slice(0, 254);
  if (!email) {
    return { isError: true, content: [{ type: "text", text: "Email is required." }] };
  }

  const result = await validateEmail(email);
  const lines = [
    `Email: ${result.email}`,
    `Status: ${result.status.toUpperCase()}`,
    `Provider: ${result.provider}`,
    `Confidence: ${result.confidence}%`,
    ``,
    `Checks:`,
    `  Syntax: ${result.syntax ? "✓" : "✗"}`,
    `  Domain: ${result.domain ? "✓" : "✗"}`,
    `  MX records: ${result.mx ? "✓" : "✗"}`,
    `  Disposable: ${result.disposable ? "YES ✗" : "No ✓"}`,
    `  Role account: ${result.role ? "YES (info@, admin@)" : "No ✓"}`,
    `  Catch-all: ${result.catchAll ? "Yes" : "No"}`,
  ];

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

async function handleValidateEmailsBulk(args) {
  const emails = (args.emails || []).slice(0, 50).map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) {
    return { isError: true, content: [{ type: "text", text: "At least one email is required." }] };
  }

  const results = await Promise.all(emails.map((e) => validateEmail(e)));

  const accepted = results.filter((r) => r.status === "accepted").length;
  const limited = results.filter((r) => r.status === "limited").length;
  const rejected = results.filter((r) => r.status === "rejected").length;

  const table = results
    .map((r) => `${r.status === "accepted" ? "✓" : r.status === "limited" ? "~" : "✗"} ${r.email} | ${r.status} | ${r.provider} | ${r.confidence}%`)
    .join("\n");

  return {
    content: [
      { type: "text", text: `Validated ${results.length} emails: ${accepted} accepted, ${limited} limited, ${rejected} rejected.\n\n${table}` },
    ],
  };
}

// ---------------------------------------------------------------------------
// JSON-RPC Message Handling
// ---------------------------------------------------------------------------

function makeResponse(id, result) {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

function makeError(id, code, message) {
  return JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize":
      return makeResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
      return null;

    case "tools/list":
      return makeResponse(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = params?.name;
      const args = params?.arguments || {};
      let result;
      try {
        if (toolName === "discover") result = await handleDiscover(args);
        else if (toolName === "search_google_maps") result = await handleSearchGoogleMaps(args);
        else if (toolName === "validate_email") result = await handleValidateEmail(args);
        else if (toolName === "validate_emails_bulk") result = await handleValidateEmailsBulk(args);
        else return makeError(id, -32601, `Unknown tool: ${toolName}`);
      } catch (err) {
        result = { isError: true, content: [{ type: "text", text: `Error: ${err.message}` }] };
      }
      return makeResponse(id, result);
    }

    case "ping":
      return makeResponse(id, {});

    default:
      if (id) return makeError(id, -32601, `Method not found: ${method}`);
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stdio Transport
// ---------------------------------------------------------------------------

const rl = createInterface({ input: process.stdin });
let buffer = "";

process.stdin.on("data", (chunk) => {
  buffer += chunk.toString();
  let newlineIdx;
  while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, newlineIdx).trim();
    buffer = buffer.slice(newlineIdx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      handleMessage(msg).then((response) => {
        if (response) {
          process.stdout.write(response + "\n");
        }
      });
    } catch {
      process.stdout.write(makeError(null, -32700, "Parse error") + "\n");
    }
  }
});

process.stderr.write(`[social-discovery-engine MCP v2] Ready. Tools: discover, search_google_maps, validate_email, validate_emails_bulk\n`);
