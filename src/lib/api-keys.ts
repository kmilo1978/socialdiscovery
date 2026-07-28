// API Key Pool Manager
// Allows multiple SerpAPI keys to be configured, rotated, and tracked.
// Keys are stored in .env.local as SERPAPI_KEYS (comma-separated) or the single SERPAPI_KEY.
// The system round-robins through available keys to maximize total quota.

export interface ApiKeyInfo {
  key: string;
  label: string;
  usedThisMonth: number;
  monthlyLimit: number;
  active: boolean;
}

/**
 * Loads all configured SerpAPI keys from environment.
 * Supports: SERPAPI_KEYS=key1,key2,key3 (comma-separated pool)
 * Fallback: SERPAPI_KEY=single_key (backwards compatible)
 */
export function loadApiKeys(): string[] {
  const pool = process.env.SERPAPI_KEYS;
  if (pool) {
    return pool.split(",").map((k) => k.trim()).filter((k) => k.length > 10);
  }
  const single = process.env.SERPAPI_KEY;
  if (single && single.length > 10) return [single];
  return [];
}

// Round-robin index stored in memory (resets on server restart, which is fine).
let currentKeyIndex = 0;

/**
 * Gets the next API key using round-robin rotation.
 * Call this for each search to distribute load across keys.
 */
export function getNextApiKey(): string | null {
  const keys = loadApiKeys();
  if (keys.length === 0) return null;
  const key = keys[currentKeyIndex % keys.length];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return key;
}

/**
 * Gets a specific key by index (for display purposes in the UI).
 */
export function getKeyByIndex(index: number): string | null {
  const keys = loadApiKeys();
  return keys[index] || null;
}

/**
 * Returns info about all configured keys (for the Settings/API page).
 * Does NOT expose the full key — only first 8 + last 4 chars.
 */
export function getKeyPoolInfo(): { totalKeys: number; totalMonthlyCredits: number; keys: Array<{ label: string; masked: string }> } {
  const keys = loadApiKeys();
  const CREDITS_PER_KEY = 250; // Adjust based on your plan

  return {
    totalKeys: keys.length,
    totalMonthlyCredits: keys.length * CREDITS_PER_KEY,
    keys: keys.map((k, i) => ({
      label: `Key ${i + 1}`,
      masked: k.slice(0, 8) + "..." + k.slice(-4),
    })),
  };
}
