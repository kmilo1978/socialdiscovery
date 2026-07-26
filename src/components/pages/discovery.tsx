"use client";

import { useState } from "react";
import { Search, Zap, Clock, Target, Info, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { SearchState } from "@/app/page";

interface DiscoveryPageProps {
  platform: string;
  onResults: (data: SearchState) => void;
}

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
  const [country, setCountry] = useState("All Countries");
  const [maxResults, setMaxResults] = useState(50);
  const [b2b, setB2b] = useState(true);
  const [includeSynonyms, setIncludeSynonyms] = useState(true);
  const [exactMatch, setExactMatch] = useState(false);
  const [avoidDuplicates, setAvoidDuplicates] = useState(true);
  const [validateEmails, setValidateEmails] = useState(true);
  const [requireEmail, setRequireEmail] = useState(true);
  const [scanMode, setScanMode] = useState<"fast" | "normal" | "deep">("normal");
  const [isSearching, setIsSearching] = useState(false);

  const title = platformLabels[platform] || "Discovery Search";

  const handleSearch = async () => {
    if (!keyword || keyword.trim().length < 2) {
      addToast({ type: "warning", title: "Keyword required", description: "Enter at least 2 characters." });
      return;
    }

    setIsSearching(true);
    addToast({ type: "info", title: "Search started", description: "Querying Google footprints..." });

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          keyword,
          country,
          maxResults,
          exactMatch,
          includeSynonyms,
          avoidDuplicates,
          validateEmails,
          requireEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          type: "error",
          title: "Search failed",
          description: data.error || "Unknown error",
        });
        setIsSearching(false);
        return;
      }

      addToast({
        type: "success",
        title: `${data.total} profiles found`,
        description: `via ${data.provider === "google_cse" ? "Google Custom Search" : data.provider}`,
      });

      onResults({
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
        <div className="grid grid-cols-2 gap-4">
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
            <label className="text-sm font-medium text-foreground">Maximum Results</label>
            <input
              type="number"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              min={10}
              max={100}
              className="w-full h-10 px-3 bg-background rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>
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
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Include Synonyms", checked: includeSynonyms, onChange: setIncludeSynonyms },
            { label: "Exact Match", checked: exactMatch, onChange: setExactMatch },
            { label: "Avoid Duplicates", checked: avoidDuplicates, onChange: setAvoidDuplicates },
            { label: "Validate Emails", checked: validateEmails, onChange: setValidateEmails },
            { label: "Require Email (footprint)", checked: requireEmail, onChange: setRequireEmail },
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

        {/* Scan Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Scan Mode</label>
          <div className="grid grid-cols-3 gap-3">
            {(["fast", "normal", "deep"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setScanMode(mode)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                  scanMode === mode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {mode === "fast" && <Zap size={18} />}
                {mode === "normal" && <Clock size={18} />}
                {mode === "deep" && <Target size={18} />}
                <span className="text-sm font-medium capitalize">{mode}</span>
                <span className="text-[11px] text-muted-foreground">
                  {mode === "fast" && "1 page"}
                  {mode === "normal" && "up to 50"}
                  {mode === "deep" && "up to 100"}
                </span>
              </button>
            ))}
          </div>
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
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimated Results</div>
          <div className="text-lg font-bold text-foreground">~{maxResults}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Search Queries</div>
          <div className="text-lg font-bold text-foreground">{Math.ceil(maxResults / 10)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimated Time</div>
          <div className="text-lg font-bold text-foreground">
            {scanMode === "fast" ? "~5s" : scanMode === "normal" ? "~15s" : "~30s"}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <Info size={16} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          This tool only searches publicly indexed pages via the Google Custom Search API. Configure your
          API key in <code className="text-primary">.env.local</code> (see README). Results depend on what
          Google has indexed for your footprint query.
        </p>
      </div>

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
