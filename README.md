# Social Discovery Engine

A real SaaS-style lead-discovery tool. It finds public social profiles using **Google footprints (dorks)**, and validates emails with **real DNS/MX checks**.

> ⚠️ **Google Custom Search JSON API is closed to new customers (since 2025).** New Google Cloud projects get a `403 PERMISSION_DENIED — "This project does not have the access to Custom Search JSON API"` no matter how the key/CX are configured. Existing users (API already enabled pre-2025) keep access until Jan 1, 2027. **If you're starting fresh, use SerpAPI instead** (see Setup below) or stick to Basic mode (no key needed).

## How it works

1. **Footprints** — For a keyword + platform, the app builds Google search queries like:
   ```
   site:linkedin.com/in "marketing manager" "Mexico" ("@gmail.com" OR "@hotmail.com")
   ```
2. **Search** — The query runs through the Google Custom Search JSON API (or SerpAPI).
3. **Extraction** — Emails, usernames, names, phones and websites are parsed from the results.
4. **Validation** — Emails can be checked in real time (syntax + domain + MX records + disposable/role detection).

Everything only touches **publicly indexed pages**. No login-walled scraping.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure a search provider (required for real discovery)

Copy the example env file and add your keys:
```bash
cp .env.local.example .env.local
```

**SerpAPI (recommended for new setups, 100 free searches/month):**
- Sign up at https://serpapi.com/users/sign_up (no credit card for the free tier)
- Copy your API key from the dashboard → set `SERPAPI_KEY`

**Google Custom Search (only works if your Google Cloud project already had it enabled before 2025):**
- Create a Programmable Search Engine: https://programmablesearchengine.google.com/
  - Set it to **"Search the entire web"**, copy the **Search engine ID** → `GOOGLE_CSE_CX`
- Enable the Custom Search API and create an API key: https://developers.google.com/custom-search/v1/introduction
  - Copy the key → `GOOGLE_CSE_KEY`
- If you get a 403 `PERMISSION_DENIED`, your project is new and Google has blocked it — switch to SerpAPI instead.

> Without a provider, discovery returns a helpful error but **email validation still works** (it only needs DNS).

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
| **API (SerpAPI / Google)** | SerpAPI or Google CSE | Required | Fast | 100 |

Basic mode tries DuckDuckGo first; if it's throttled it automatically falls back to Bing. Both are scraped without an API key and throttled to avoid anti-bot blocks. API mode is faster and returns more results but consumes your quota (demo data is returned if no key is set).

Optional **profile enrichment**: check "Enrich Profiles" to have the app visit each result's URL and pull real bio, followers/following, verified status, and external links (Instagram, LinkedIn, TikTok, YouTube, X, Facebook). Adds a few seconds per search but turns snippet-only data into real profile data.

## Database & history

All searches (and their leads) and every email validation are persisted to a local **SQLite** database at `data/app.db`, using Node's built-in `node:sqlite` (no native compilation required — works out of the box on Windows/macOS/Linux).

- **Dashboard** — real aggregates: total profiles/emails found, validation success rate, credits used, a 7-day trend chart, and your 5 most recent searches. All computed from the DB, no mock data.
- **Search History** — every past search with a 👁 button to reopen its full results (leads reloaded from the DB).
- **Email Validator** — the history table loads real past validations; bulk CSV validation results are also persisted.

The `data/` folder is gitignored — each environment keeps its own local database.

## Security

- **Anti-injection:** the keyword is sanitized before being embedded in a search query — control characters, quotes, and injected operators (`site:`, `inurl:`, …) are stripped. Platform is whitelisted; numbers/booleans are coerced and clamped.
- **API key protection:** keys live server-side only and are never sent to the client. Provider errors never include the request URL (which would carry the key), and all outgoing messages are run through a secret scrubber (`redacts AIza…` keys, `key`/`api_key`/`cx` params, and any configured env value).
- **Rate limiting:** in-memory per-client limits (discovery 20/min, validation 60/min) return HTTP 429 with `Retry-After`.
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, plus `no-store` on all API routes.

## What is real vs. simulated

| Feature | Status |
|---|---|
| Email validation (syntax + MX + disposable/role) | **Real** (uses Node DNS) |
| Discovery — Basic mode (footprints, DDG + Bing) | **Real** (no key, throttled, max 40) |
| Discovery — API mode | **Real** (needs API key, max 100) |
| Profile enrichment (bio/followers/verified) | **Real** (visits each profile URL) |
| Persistence (searches, leads, validations) | **Real** (SQLite, `data/app.db`) |
| Dashboard stats / charts | **Real** (computed from the DB) |
| Search History (reopen past results) | **Real** (from the DB) |
| CSV export of results | **Real** |
| Exports page | Demo data |

## Legal & ethical use

- Only searches publicly indexed content.
- Respect each platform's Terms of Service and `robots.txt`.
- Comply with data-protection laws (GDPR, CCPA) when storing or contacting leads.
- Free API tiers are rate-limited (SerpAPI: 100/month, Google CSE: 100/day for legacy projects); heavy use requires a paid plan.
