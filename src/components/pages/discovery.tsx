"use client";

import { useState } from "react";
import { Search, Zap, Clock, Target, Info, AlertTriangle, Loader2, Globe, KeyRound, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { SearchState } from "@/app/page";
import { GEOLOCATIONS } from "@/lib/geolocations";

interface DiscoveryPageProps {
  platform: string;
  onResults: (data: SearchState) => void;
}

type Mode = "basic" | "api";

// Mirror of server-side MODE_LIMITS (search-providers.ts). Keep in sync.
const MODE_LIMITS: Record<Mode, { maxResults: number; approxTime: string; label: string }> = {
  basic: { maxResults: 40, approxTime: "~30-60s", label: "Basic (Footprints)" },
  api: { maxResults: 250, approxTime: "~10-30s", label: "API (SerpAPI)" },
};

const searchTypeCodes: Record<string, string> = {
  "instagram-keyword": "INSTAGRAM_WORD",
  "instagram-hashtag": "INSTAGRAM_HASHTAG",
  "twitter-keyword": "X_WORD",
  "twitter-followers": "X_FOLLOWERS",
  "twitter-following": "X_FOLLOWING",
  "facebook-keyword": "FACEBOOK_WORD",
  "linkedin-keyword": "LINKEDIN_WORD",
  "youtube-keyword": "YOUTUBE_WORD",
  "tiktok-keyword": "TIKTOK_WORD",
  "multiple-channels": "MULTI_WORD",
};

const platformLabels: Record<string, string> = {
  "instagram-keyword": "Instagram Keyword Search",
  "instagram-hashtag": "Instagram Hashtag Search",
  "twitter-keyword": "X (Twitter) Keyword Search",
  "twitter-followers": "X (Twitter) Followers Search",
  "twitter-following": "X (Twitter) Following Search",
  "facebook-keyword": "Facebook Keyword Search",
  "linkedin-keyword": "LinkedIn Keyword Search",
  "youtube-keyword": "YouTube Keyword Search",
  "tiktok-keyword": "TikTok Keyword Search",
  "multiple-channels": "Multiple Channels Search",
};

const countries = [
  "All Countries",
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Spain",
  "Canada",
  "Australia",
  "India",
  "Japan",
  "— Latin America —",
  "Argentina",
  "Bolivia",
  "Brazil",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Dominican Republic",
  "Ecuador",
  "El Salvador",
  "Guatemala",
  "Honduras",
  "Mexico",
  "Nicaragua",
  "Panama",
  "Paraguay",
  "Peru",
  "Puerto Rico",
  "Uruguay",
  "Venezuela",
];

export function DiscoveryPage({ platform, onResults }: DiscoveryPageProps) {
  const { addToast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [city, setCity] = useState(""); // optional city for more specific footprints
  const [geoLocation, setGeoLocation] = useState("co"); // gl code (empty = global)
  const [mode, setMode] = useState<Mode>("api");
  const [maxResults, setMaxResults] = useState(50);
  const [b2b, setB2b] = useState(true);
  const [includeSynonyms, setIncludeSynonyms] = useState(true);
  const [exactMatch, setExactMatch] = useState(false);
  const [avoidDuplicates, setAvoidDuplicates] = useState(true);
  const [validateEmails, setValidateEmails] = useState(true);
  const [requireEmail, setRequireEmail] = useState(true);
  const [enrichResults, setEnrichResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const title = platformLabels[platform] || "Discovery Search";
  const cap = MODE_LIMITS[mode].maxResults;

  // When switching mode, clamp the requested results to the new cap.
  const changeMode = (m: Mode) => {
    setMode(m);
    setMaxResults((prev) => Math.min(prev, MODE_LIMITS[m].maxResults));
  };

  const handleSearch = async () => {
    if (!keyword || keyword.trim().length < 2) {
      addToast({ type: "warning", title: "Keyword required", description: "Enter at least 2 characters." });
      return;
    }

    const clamped = Math.min(Math.max(maxResults, 10), cap);
    setIsSearching(true);
    addToast({
      type: "info",
      title: "Search started",
      description:
        mode === "basic"
          ? "Basic mode is throttled to avoid blocks — this can take up to a minute."
          : "Querying via API...",
    });

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          keyword,
          country,
          city,
          mode,
          geoLocation,
          maxResults: clamped,
          exactMatch,
          includeSynonyms,
          avoidDuplicates,
          validateEmails,
          requireEmail,
          enrichResults,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        addToast({
          type: "error",
          title: "Server error",
          description: "The server returned an invalid response. Make sure you're running on localhost (Netlify doesn't support this app's backend).",
        });
        setIsSearching(false);
        return;
      }

      if (!res.ok) {
        addToast({
          type: "error",
          title: res.status === 429 ? "Rate limit" : "Search failed",
          description: data.error || "Unknown error",
        });
        setIsSearching(false);
        return;
      }

      const providerName =
        data.provider === "serpapi"
          ? "SerpAPI"
          : data.provider === "duckduckgo" || data.provider === "basic_multi"
          ? "DuckDuckGo / Bing (Basic)"
          : data.provider;

      addToast({
        type: "success",
        title: `${data.total} results found`,
        description: `via ${providerName}`,
      });

      onResults({
        searchId: data.searchId,
        leads: data.leads,
        queries: data.queries,
        provider: data.provider,
        meta: {
          platform,
          keyword,
          country,
          searchType: searchTypeCodes[platform] || "WEB_WORD",
        },
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Network error",
        description: err instanceof Error ? err.message : "Could not reach the server",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Uses Google footprints (dorks) to discover public profiles indexed by search engines.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        {/* Search Method (Basic vs API) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Search Method</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => changeMode("basic")}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                mode === "basic"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Globe size={18} className={mode === "basic" ? "text-primary mt-0.5" : "text-muted-foreground mt-0.5"} />
              <div>
                <div className={`text-sm font-medium ${mode === "basic" ? "text-primary" : "text-foreground"}`}>
                  Basic (Footprints)
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  No API key · slower (throttled) · max 40 results
                </div>
              </div>
            </button>
            <button
              onClick={() => changeMode("api")}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                mode === "api"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <KeyRound size={18} className={mode === "api" ? "text-primary mt-0.5" : "text-muted-foreground mt-0.5"} />
              <div>
                <div className={`text-sm font-medium ${mode === "api" ? "text-primary" : "text-foreground"}`}>
                  API (SerpAPI)
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Needs API key · faster · max 250 results
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Keyword */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Keyword</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isSearching && handleSearch()}
              placeholder='e.g. "SaaS founders" or "marketing agency"'
              className="w-full h-10 pl-9 pr-4 bg-background rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Country + Max Results */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-10 px-3 bg-background rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none"
            >
              {countries.map((c) => (
                <option key={c} value={c} disabled={c.startsWith("—")}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center justify-between">
              <span>Maximum Results</span>
              <span className="text-[11px] text-muted-foreground font-normal">max {cap}</span>
            </label>
            <input
              type="number"
              value={maxResults}
              onChange={(e) => setMaxResults(Math.min(Number(e.target.value), cap))}
              min={10}
              max={cap}
              className="w-full h-10 px-3 bg-background rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* City (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center justify-between">
            <span>City</span>
            <span className="text-[11px] text-muted-foreground font-normal">optional</span>
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder='e.g. "Bogotá", "Medellín", "New York"'
            className="w-full h-10 px-3 bg-background rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Search Geolocation */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <MapPin size={14} className="text-primary" />
            Search Geolocation
          </label>
          <select
            value={geoLocation}
            onChange={(e) => setGeoLocation(e.target.value)}
            className="w-full h-10 px-3 bg-background rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none"
          >
            {GEOLOCATIONS.map((g) => (
              <option key={g.gl || "__global"} value={g.gl}>
                {g.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground">
            Simulates searching from this region (e.g. Google US, Google Colombia). Affects which results are prioritized.
          </p>
        </div>

        {/* Toggle B2B / B2C */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Target Audience</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setB2b(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                b2b ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              B2B
            </button>
            <button
              onClick={() => setB2b(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !b2b ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              B2C
            </button>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Include Synonyms", checked: includeSynonyms, onChange: setIncludeSynonyms },
            { label: "Exact Match", checked: exactMatch, onChange: setExactMatch },
            { label: "Avoid Duplicates", checked: avoidDuplicates, onChange: setAvoidDuplicates },
            { label: "Validate Emails", checked: validateEmails, onChange: setValidateEmails },
            { label: "Require Email (footprint)", checked: requireEmail, onChange: setRequireEmail },
            { label: "Enrich Profiles (bio + followers)", checked: enrichResults, onChange: setEnrichResults },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.onChange(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary/50 accent-primary"
              />
              <span className="text-sm text-foreground">{item.label}</span>
            </label>
          ))}
        </div>

        {/* Start Search Button */}
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/20"
        >
          {isSearching ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search size={16} />
              Start Search
            </>
          )}
        </button>
      </div>

      {/* Estimation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimated Results</div>
          <div className="text-lg font-bold text-foreground">~{Math.min(maxResults, cap)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Method</div>
          <div className="text-lg font-bold text-foreground">{mode === "basic" ? "Basic" : "API"}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimated Time</div>
          <div className="text-lg font-bold text-foreground">{MODE_LIMITS[mode].approxTime}</div>
        </div>
      </div>

      {/* Mode-specific info */}
      {mode === "basic" ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <Globe size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary font-medium">Basic mode</span> uses DuckDuckGo + Bing as fallback —
            no API key needed. To avoid being blocked it is throttled (~2s between requests)
            and capped at <span className="text-foreground font-medium">40 results</span>.
            Best for quick, low-volume searches.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <KeyRound size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary font-medium">API mode</span> uses SerpAPI — faster and up to{" "}
            <span className="text-foreground font-medium">250 results</span>, but it consumes your quota. Add
            your key as <code className="text-primary">SERPAPI_KEY</code> in{" "}
            <code className="text-primary">.env.local</code> (see README, or the API Access page to check
            usage and upgrade). Without a key, API mode returns demo data.
          </p>
        </div>
      )}

      {/* Legal note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/5 border border-warning/20">
        <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Use responsibly. Respect each platform&apos;s Terms of Service, robots.txt, and data-protection
          laws (GDPR, CCPA) when collecting and contacting leads.
        </p>
      </div>
    </div>
  );
}
