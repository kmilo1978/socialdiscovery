#!/usr/bin/env node
// =============================================================================
// Social Discovery Engine — MCP Server
// Exposes discovery search + email validation as tools via JSON-RPC over stdio.
// Compatible with Claude Desktop, Kiro, and any MCP-compliant client.
//
// Run: node mcp-server.mjs
// Or point an MCP config to: { "command": "node", "args": ["mcp-server.mjs"] }
// =============================================================================

import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { config } from "dotenv";

// Load .env.local so SERPAPI_KEY is available.
config({ path: resolve(process.cwd(), ".env.local") });

// Dynamically import the app's lib modules (they use node:sqlite, DNS, etc.)
const { buildFootprints, searchTypeCode } = await import("./src/lib/footprints.ts");
const { runSearch, apiProvider, MODE_LIMITS } = await import("./src/lib/search-providers.ts");
const { extractLeads } = await import("./src/lib/extractors.ts");
const { validateEmail } = await import("./src/lib/email-validator.ts");
const { sanitizeKeyword, sanitizeLabel, clampNumber, toBool } = await import("./src/lib/security.ts");

// ---------------------------------------------------------------------------
// MCP Protocol Implementation (JSON-RPC 2.0 over stdio)
// ---------------------------------------------------------------------------

const SERVER_INFO = {
  name: "social-discovery-engine",
  version: "1.0.0",
};

const TOOLS = [
  {
    name: "discover",
    description:
      "Search for public social media profiles using Google footprints (dorks). " +
      "Finds emails, usernames, bios from Instagram, LinkedIn, X, Facebook, YouTube, TikTok. " +
      "Supports geolocation (search as if from a specific country) and optional email validation.",
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
        country: { type: "string", description: "Country filter in the footprint query (e.g. 'Mexico', 'United States')" },
        geoLocation: { type: "string", description: "ISO country code for search geolocation (e.g. 'us', 'co', 'mx')" },
        mode: { type: "string", enum: ["basic", "api"], description: "basic = free (DDG+Bing, max 40), api = SerpAPI (max 100)" },
        maxResults: { type: "number", description: "Maximum results to return (10-100)" },
        requireEmail: { type: "boolean", description: "Only find profiles that expose an email address" },
        validateEmails: { type: "boolean", description: "Run real DNS/MX validation on found emails" },
      },
      required: ["platform", "keyword"],
    },
  },
  {
    name: "validate_email",
    description:
      "Validate an email address with real DNS/MX record checks. " +
      "Returns: status (accepted/limited/rejected), provider detection (Google Workspace, Microsoft 365, etc.), " +
      "disposable domain check, role account detection, and confidence score.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to validate" },
      },
      required: ["email"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

async function handleDiscover(args) {
  const platform = args.platform || "linkedin-keyword";
  const keyword = sanitizeKeyword(args.keyword);
  const country = sanitizeLabel(args.country) || "All Countries";
  const geoLocation = sanitizeLabel(args.geoLocation, 10) || "";
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
      content: [{ type: "text", text: "API mode requires SERPAPI_KEY in .env.local. Use mode='basic' instead (no key needed)." }],
    };
  }

  const footprints = buildFootprints({ platform, keyword, country, requireEmail, exactMatch: false, includeSynonyms: true });
  const pagesNeeded = mode === "basic" ? 1 : Math.min(Math.ceil(maxResults / 10), 5);

  const rawAll = [];
  const usedQueries = [];

  for (const fp of footprints) {
    usedQueries.push(fp.query);
    for (let page = 0; page < pagesNeeded; page++) {
      try {
        const results = await runSearch(fp.query, page, mode, geoLocation);
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

  const summary = `Found ${leads.length} profiles via ${provider} (${usedQueries.length} queries).`;
  const emailCount = leads.filter((l) => l.email && l.email !== "—").length;
  const table = leads
    .map((l) => `• ${l.email !== "—" ? l.email : "(no email)"} | ${l.name} | ${l.platform} | ${l.profileUrl}`)
    .join("\n");

  return {
    content: [
      { type: "text", text: `${summary}\n${emailCount} with email.\n\nQueries used:\n${usedQueries.join("\n")}\n\nResults:\n${table}` },
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
    `  Domain exists: ${result.domain ? "✓" : "✗"}`,
    `  MX records: ${result.mx ? "✓" : "✗"}`,
    `  Disposable: ${result.disposable ? "YES (rejected)" : "No"}`,
    `  Role account: ${result.role ? "YES (info@, admin@, etc.)" : "No"}`,
    `  Catch-all: ${result.catchAll ? "Yes" : "No"}`,
  ];

  return { content: [{ type: "text", text: lines.join("\n") }] };
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
      return null; // No response needed for notifications.

    case "tools/list":
      return makeResponse(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = params?.name;
      const args = params?.arguments || {};
      let result;
      try {
        if (toolName === "discover") result = await handleDiscover(args);
        else if (toolName === "validate_email") result = await handleValidateEmail(args);
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
      return null; // Unknown notification, ignore.
  }
}

// ---------------------------------------------------------------------------
// Stdio Transport
// ---------------------------------------------------------------------------

const rl = createInterface({ input: process.stdin });
let buffer = "";

process.stdin.on("data", (chunk) => {
  buffer += chunk.toString();
  // Process complete lines (JSON-RPC messages are newline-delimited).
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

process.stderr.write(`[social-discovery-engine MCP] Server started. Waiting for JSON-RPC on stdin...\n`);
