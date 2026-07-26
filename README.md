# Social Discovery Engine

A real SaaS-style lead-discovery tool. It finds public social profiles using **Google footprints (dorks)**, and validates emails with **real DNS/MX checks**.

## How it works

1. **Footprints** — For a keyword + platform, the app builds Google-style dork queries like:
   ```
   site:linkedin.com/in "marketing manager" "Mexico" ("@gmail.com" OR "@hotmail.com")
   ```
2. **Search** — The query runs through **SerpAPI** (API mode) or is scraped directly from DuckDuckGo/Bing (Basic mode, no key needed).
3. **Extraction** — Emails, usernames, names, phones and websites are parsed from the results.
4. **Validation** — Emails can be checked in real time (syntax + domain + MX records + disposable/role detection).

Everything only touches **publicly indexed pages**. No login-walled scraping.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure SerpAPI (required for API mode; optional otherwise)

Copy the example env file:
```bash
cp .env.local.example .env.local
```

- Sign up for free at https://serpapi.com/users/sign_up (100 searches/month, no credit card)
- Copy your key from https://serpapi.com/manage-api-key → set `SERPAPI_KEY`
- Restart the server

> Without a key, **API mode returns demo data**. **Basic mode** (DuckDuckGo + Bing) and **email validation** work fully without any key.

### 3. Run
```bash
npm run dev
```
Open http://localhost:3000

## Search modes

The discovery form lets you pick how the footprint query runs:

| Mode | Provider | API key | Speed | Max results |
|---|---|---|---|---|
| **Basic (Footprints)** | DuckDuckGo HTML + Bing fallback | Not needed | Slower (throttled ~2s/req) | 40 |
| **API (SerpAPI)** | SerpAPI | Required | Fast | 100 |

Basic mode tries DuckDuckGo first; if it's throttled it automatically falls back to Bing. Both are scraped without an API key and throttled to avoid anti-bot blocks. API mode is faster and returns more results but consumes your SerpAPI quota (demo data is returned if no key is set).

Optional **profile enrichment**: check "Enrich Profiles" to have the app visit each result's URL and pull real bio, followers/following, verified status, and external links (Instagram, LinkedIn, TikTok, YouTube, X, Facebook). Adds a few seconds per search but turns snippet-only data into real profile data.

## Upgrading to a paid plan

This app doesn't have its own billing — it uses **your own SerpAPI key**, so upgrading is entirely on SerpAPI's side and requires no code changes here:

1. Go to the **API Access** page inside the app to see your real usage this month (progress bar against the free 100/month quota).
2. When you're close to the limit, click **Upgrade Plan** (or go directly to https://serpapi.com/pricing).
3. Pick a paid tier (plans start at 5,000 searches/month).
4. Your existing `SERPAPI_KEY` keeps working automatically — nothing to change in `.env.local` or the code.

Usage shown in the app counts real "API mode" searches recorded in the local database (`mode='api'`, excluding demo results) for the current calendar month. It's informational — SerpAPI enforces the actual limit on their side.

## Database & history

All searches (and their leads) and every email validation are persisted to a local **SQLite** database at `data/app.db`, using Node's built-in `node:sqlite` (no native compilation required — works out of the box on Windows/macOS/Linux).

- **Dashboard** — real aggregates: total profiles/emails found, validation success rate, credits used, a 7-day trend chart, and your 5 most recent searches. All computed from the DB, no mock data.
- **Search History** — every past search with a 👁 button to reopen its full results (leads reloaded from the DB).
- **Email Validator** — the history table loads real past validations; bulk CSV validation results are also persisted.
- **API Access** — real SerpAPI usage this month, pulled from the same database.

The `data/` folder is gitignored — each environment keeps its own local database.

## Security

- **Anti-injection:** the keyword is sanitized before being embedded in a search query — control characters, quotes, and injected operators (`site:`, `inurl:`, …) are stripped. Platform is whitelisted; numbers/booleans are coerced and clamped.
- **API key protection:** the SerpAPI key lives server-side only and is never sent to the client. Provider errors never include the request URL (which would carry the key), and all outgoing messages are run through a secret scrubber that redacts the configured key value and any `key`/`api_key` query params.
- **Rate limiting:** in-memory per-client limits (discovery 20/min, validation 60/min) return HTTP 429 with `Retry-After`.
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, plus `no-store` on all API routes.

## What is real vs. simulated

| Feature | Status |
|---|---|
| Email validation (syntax + MX + disposable/role) | **Real** (uses Node DNS) |
| Discovery — Basic mode (footprints, DDG + Bing) | **Real** (no key, throttled, max 40) |
| Discovery — API mode (SerpAPI) | **Real** (needs `SERPAPI_KEY`, max 100) |
| Profile enrichment (bio/followers/verified) | **Real** (visits each profile URL) |
| Persistence (searches, leads, validations) | **Real** (SQLite, `data/app.db`) |
| Dashboard stats / charts | **Real** (computed from the DB) |
| Search History (reopen past results) | **Real** (from the DB) |
| API Access usage / upgrade path | **Real** (real usage count + link to SerpAPI billing) |
| MCP Server (AI tool integration) | **Real** (JSON-RPC/stdio, Kiro + Claude Desktop) |
| i18n (English, Español, Português) | **Real** (localStorage persisted, selector in Settings) |
| CSV export of results | **Real** |
| Exports page | Demo data |

## MCP Server (AI integration)

The project includes a standalone MCP (Model Context Protocol) server that exposes two tools for AI assistants:

- `discover` — run a full discovery search (platform, keyword, country, geolocation, mode, etc.)
- `validate_email` — validate any email with real DNS/MX checks

**Usage with Kiro:** already configured at `.kiro/settings/mcp.json` — tools appear automatically.

**Usage with Claude Desktop:** copy `mcp-config.json` to your Claude Desktop config, or run manually:
```bash
node --experimental-strip-types mcp-server.mjs
```

## Multi-language (i18n)

The interface supports three languages, selectable from **Settings → Language**:

| Language | Code |
|---|---|
| 🇺🇸 English | `en` |
| 🇪🇸 Español | `es` |
| 🇧🇷 Português | `pt` |

The choice is persisted in `localStorage`. To add a new language: create `src/lib/i18n/<code>.ts`, add it to `LOCALES` + `TRANSLATIONS` in `src/lib/i18n/index.ts`.

## Legal & ethical use

- Only searches publicly indexed content.
- Respect each platform's Terms of Service and `robots.txt`.
- Comply with data-protection laws (GDPR, CCPA) when storing or contacting leads.
- SerpAPI's free tier is rate-limited (100 searches/month); heavy use requires a paid plan (see "Upgrading to a paid plan" above).
