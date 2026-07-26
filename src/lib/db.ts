// SQLite persistence layer using Node's built-in `node:sqlite` (Node 22.5+).
// No native compilation needed (unlike better-sqlite3), which keeps setup
// friction-free on Windows/macOS/Linux alike.
//
// Stores: searches (discovery runs), leads (extracted results per search),
// and email_validations (validator history). Single-file DB at data/app.db.

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import type { Lead } from "./extractors";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Reuse a single connection across hot-reloads in dev (Next.js re-imports modules).
const globalForDb = globalThis as unknown as { __sdDb?: DatabaseSync };

function getDb(): DatabaseSync {
  if (globalForDb.__sdDb) return globalForDb.__sdDb;

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS searches (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      keyword TEXT NOT NULL,
      country TEXT,
      geo_location TEXT,
      mode TEXT NOT NULL,
      provider TEXT NOT NULL,
      search_type TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      total_results INTEGER NOT NULL DEFAULT 0,
      emails_found INTEGER NOT NULL DEFAULT 0,
      credits_used INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT NOT NULL,
      search_id TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
      platform TEXT,
      name TEXT,
      description TEXT,
      username TEXT,
      website TEXT,
      email TEXT,
      phone TEXT,
      followers TEXT,
      country TEXT,
      status TEXT,
      lead_score INTEGER,
      profile_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (id, search_id)
    );

    CREATE TABLE IF NOT EXISTS email_validations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      status TEXT NOT NULL,
      syntax INTEGER NOT NULL,
      domain INTEGER NOT NULL,
      mx INTEGER NOT NULL,
      disposable INTEGER NOT NULL,
      role INTEGER NOT NULL,
      catch_all INTEGER NOT NULL,
      provider TEXT,
      confidence INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_leads_search_id ON leads(search_id);
    CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at);
    CREATE INDEX IF NOT EXISTS idx_validations_created_at ON email_validations(created_at);
    CREATE INDEX IF NOT EXISTS idx_validations_email ON email_validations(email);
  `);

  globalForDb.__sdDb = db;
  return db;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchRecord {
  id: string;
  platform: string;
  keyword: string;
  country: string;
  geoLocation: string;
  mode: string;
  provider: string;
  searchType: string;
  status: "completed" | "failed" | "processing";
  totalResults: number;
  emailsFound: number;
  creditsUsed: number;
  error?: string;
  createdAt: string;
}

export interface EmailValidationRecord {
  email: string;
  status: string;
  syntax: boolean;
  domain: boolean;
  mx: boolean;
  disposable: boolean;
  role: boolean;
  catchAll: boolean;
  provider: string;
  confidence: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Persists a completed (or failed) search along with its extracted leads. */
export function saveSearch(record: {
  id: string;
  platform: string;
  keyword: string;
  country: string;
  geoLocation: string;
  mode: string;
  provider: string;
  searchType: string;
  status: "completed" | "failed";
  leads: Lead[];
  creditsUsed: number;
  error?: string;
}) {
  const db = getDb();
  const emailsFound = record.leads.filter((l) => l.email && l.email !== "—").length;

  const insertSearch = db.prepare(`
    INSERT INTO searches
      (id, platform, keyword, country, geo_location, mode, provider, search_type, status, total_results, emails_found, credits_used, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSearch.run(
    record.id,
    record.platform,
    record.keyword,
    record.country,
    record.geoLocation,
    record.mode,
    record.provider,
    record.searchType,
    record.status,
    record.leads.length,
    emailsFound,
    record.creditsUsed,
    record.error ?? null
  );

  if (record.leads.length > 0) {
    const insertLead = db.prepare(`
      INSERT OR IGNORE INTO leads
        (id, search_id, platform, name, description, username, website, email, phone, followers, country, status, lead_score, profile_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const lead of record.leads) {
      insertLead.run(
        lead.id,
        record.id,
        lead.platform,
        lead.name,
        lead.description,
        lead.username,
        lead.website,
        lead.email,
        lead.phone,
        lead.followers,
        lead.country,
        lead.status,
        lead.leadScore,
        lead.profileUrl
      );
    }
  }
}

/** Persists a single email validation result. */
export function saveValidation(v: {
  email: string;
  status: string;
  syntax: boolean;
  domain: boolean;
  mx: boolean;
  disposable: boolean;
  role: boolean;
  catchAll: boolean;
  provider: string;
  confidence: number;
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO email_validations
      (email, status, syntax, domain, mx, disposable, role, catch_all, provider, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    v.email,
    v.status,
    v.syntax ? 1 : 0,
    v.domain ? 1 : 0,
    v.mx ? 1 : 0,
    v.disposable ? 1 : 0,
    v.role ? 1 : 0,
    v.catchAll ? 1 : 0,
    v.provider,
    v.confidence
  );
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Returns the most recent searches (for the Search History page). */
export function listSearches(limit = 50): SearchRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, platform, keyword, country, geo_location as geoLocation, mode, provider,
              search_type as searchType, status, total_results as totalResults,
              emails_found as emailsFound, credits_used as creditsUsed, error,
              created_at as createdAt
       FROM searches ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit) as unknown as SearchRecord[];
  return rows;
}

/** Returns all leads for a given search id. */
export function getLeadsForSearch(searchId: string): Lead[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, platform, name, description, username, website, email, phone, followers,
              country, status, lead_score as leadScore, profile_url as profileUrl
       FROM leads WHERE search_id = ?`
    )
    .all(searchId) as unknown as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    platform: String(r.platform ?? ""),
    name: String(r.name ?? ""),
    description: String(r.description ?? ""),
    username: String(r.username ?? ""),
    website: String(r.website ?? ""),
    email: String(r.email ?? ""),
    phone: String(r.phone ?? ""),
    followers: String(r.followers ?? ""),
    country: String(r.country ?? ""),
    status: (r.status as Lead["status"]) ?? "unverified",
    leadScore: Number(r.leadScore ?? 0),
    profileUrl: String(r.profileUrl ?? ""),
    avatar: String(r.name ?? "??").slice(0, 2).toUpperCase(),
  }));
}

interface RawValidationRow {
  email: string;
  status: string;
  syntax: number;
  domain: number;
  mx: number;
  disposable: number;
  role: number;
  catchAll: number;
  provider: string;
  confidence: number;
  createdAt: string;
}

/** Returns the most recent email validations (for the Email Validator history table). */
export function listValidations(limit = 20): EmailValidationRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT email, status, syntax, domain, mx, disposable, role, catch_all as catchAll,
              provider, confidence, created_at as createdAt
       FROM email_validations ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit) as unknown as RawValidationRow[];
  return rows.map((r) => ({
    email: r.email,
    status: r.status,
    syntax: Boolean(r.syntax),
    domain: Boolean(r.domain),
    mx: Boolean(r.mx),
    disposable: Boolean(r.disposable),
    role: Boolean(r.role),
    catchAll: Boolean(r.catchAll),
    provider: r.provider,
    confidence: r.confidence,
    createdAt: r.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------------

export interface DashboardStats {
  profilesFound: number;
  emailsFound: number;
  emailsValidated: number;
  emailsAccepted: number;
  successRate: number; // accepted / validated %
  creditsUsed: number;
  searchesToday: number;
  searchesLast7Days: number;
  trend: Array<{ day: string; count: number }>;
  recentSearches: SearchRecord[];
}

/** Aggregates all stats needed by the Dashboard page from real DB data. */
export function getDashboardStats(): DashboardStats {
  const db = getDb();

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(total_results), 0) as profilesFound,
         COALESCE(SUM(emails_found), 0) as emailsFound,
         COALESCE(SUM(credits_used), 0) as creditsUsed,
         COUNT(*) as totalSearches
       FROM searches`
    )
    .get() as { profilesFound: number; emailsFound: number; creditsUsed: number; totalSearches: number };

  const validationTotals = db
    .prepare(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted
       FROM email_validations`
    )
    .get() as { total: number; accepted: number | null };

  const searchesToday = db
    .prepare(`SELECT COUNT(*) as c FROM searches WHERE date(created_at) = date('now')`)
    .get() as { c: number };

  const searchesLast7 = db
    .prepare(`SELECT COUNT(*) as c FROM searches WHERE created_at >= datetime('now', '-7 days')`)
    .get() as { c: number };

  // Trend: leads found per day for the last 7 days.
  const trendRows = db
    .prepare(
      `SELECT date(created_at) as day, COALESCE(SUM(total_results), 0) as count
       FROM searches
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY date(created_at)
       ORDER BY day ASC`
    )
    .all() as Array<{ day: string; count: number }>;

  // Fill missing days with 0 so the chart always has 7 points.
  const trendMap = new Map(trendRows.map((r) => [r.day, r.count]));
  const trend: Array<{ day: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trend.push({ day: key, count: trendMap.get(key) || 0 });
  }

  const validated = validationTotals.total || 0;
  const accepted = validationTotals.accepted || 0;

  return {
    profilesFound: totals.profilesFound,
    emailsFound: totals.emailsFound,
    emailsValidated: validated,
    emailsAccepted: accepted,
    successRate: validated > 0 ? Math.round((accepted / validated) * 1000) / 10 : 0,
    creditsUsed: totals.creditsUsed,
    searchesToday: searchesToday.c,
    searchesLast7Days: searchesLast7.c,
    trend,
    recentSearches: listSearches(5),
  };
}

// ---------------------------------------------------------------------------
// API provider usage (for the API Access page — real quota consumption)
// ---------------------------------------------------------------------------

export interface ApiUsage {
  /** Real "api" mode searches (billable against the provider's quota) this calendar month. */
  monthlyApiSearches: number;
  /** Same, but for today (useful to spot spikes). */
  todayApiSearches: number;
  /** Total "api" mode searches ever run (lifetime). */
  lifetimeApiSearches: number;
}

/**
 * Counts real provider-billed searches (mode='api', not demo) so the API Access
 * page can show actual quota consumption instead of a fake number.
 */
export function getApiUsage(): ApiUsage {
  const db = getDb();

  const monthly = db
    .prepare(
      `SELECT COUNT(*) as c FROM searches
       WHERE mode = 'api' AND provider != 'demo'
         AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
    )
    .get() as { c: number };

  const today = db
    .prepare(
      `SELECT COUNT(*) as c FROM searches
       WHERE mode = 'api' AND provider != 'demo' AND date(created_at) = date('now')`
    )
    .get() as { c: number };

  const lifetime = db
    .prepare(`SELECT COUNT(*) as c FROM searches WHERE mode = 'api' AND provider != 'demo'`)
    .get() as { c: number };

  return {
    monthlyApiSearches: monthly.c,
    todayApiSearches: today.c,
    lifetimeApiSearches: lifetime.c,
  };
}
