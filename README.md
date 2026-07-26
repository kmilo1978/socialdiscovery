# Social Discovery Engine

A real SaaS-style lead-discovery tool. It finds public social profiles using **Google footprints (dorks)** via the official Google Custom Search API, and validates emails with **real DNS/MX checks**.

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

**Google Custom Search (recommended, 100 free queries/day):**
- Create a Programmable Search Engine: https://programmablesearchengine.google.com/
  - Set it to **"Search the entire web"**, copy the **Search engine ID** → `GOOGLE_CSE_CX`
- Enable the Custom Search API and create an API key: https://developers.google.com/custom-search/v1/introduction
  - Copy the key → `GOOGLE_CSE_KEY`

**Or SerpAPI (100 free searches/month):** set `SERPAPI_KEY`.

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
| **Basic (Footprints)** | DuckDuckGo HTML | Not needed | Slower (throttled ~2.5s/req) | 30 |
| **API (Google / SerpAPI)** | Google CSE / SerpAPI | Required | Fast | 100 |

Basic mode scrapes a public search engine and is throttled to avoid anti-bot blocks; if the engine rate-limits you, wait a moment or switch to API mode. API mode is faster and returns more results but consumes your quota (demo data is returned if no key is set).

## Security

- **Anti-injection:** the keyword is sanitized before being embedded in a search query — control characters, quotes, and injected operators (`site:`, `inurl:`, …) are stripped. Platform is whitelisted; numbers/booleans are coerced and clamped.
- **API key protection:** keys live server-side only and are never sent to the client. Provider errors never include the request URL (which would carry the key), and all outgoing messages are run through a secret scrubber (`redacts AIza…` keys, `key`/`api_key`/`cx` params, and any configured env value).
- **Rate limiting:** in-memory per-client limits (discovery 20/min, validation 60/min) return HTTP 429 with `Retry-After`.
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, plus `no-store` on all API routes.

## What is real vs. simulated

| Feature | Status |
|---|---|
| Email validation (syntax + MX + disposable/role) | **Real** (uses Node DNS) |
| Discovery — Basic mode (footprints) | **Real** (no key, throttled, max 30) |
| Discovery — API mode | **Real** (needs API key, max 100) |
| CSV export of results | **Real** |
| Dashboard stats / charts | Demo data |
| Search history / Exports pages | Demo data |

## Legal & ethical use

- Only searches publicly indexed content.
- Respect each platform's Terms of Service and `robots.txt`.
- Comply with data-protection laws (GDPR, CCPA) when storing or contacting leads.
- Google's free API tier is rate-limited; heavy use requires a paid plan.
