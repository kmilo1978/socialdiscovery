"use client";

import { useState, useEffect } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Code,
  Zap,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";

interface ApiUsage {
  monthlyApiSearches: number;
  todayApiSearches: number;
  lifetimeApiSearches: number;
}

interface ProviderStatus {
  provider: string;
  connected: boolean;
  serpapi: {
    hasKey: boolean;
    monthlyFreeQuota: number;
    usage: ApiUsage;
  };
  emailValidation: boolean;
}

export function ApiPage() {
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("Loading...");
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        if (data?.publicApiKey?.key) setApiKey(data.publicApiKey.key);
        else setApiKey("Not configured — set PUBLIC_API_KEY in .env.local");
      })
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const providerLabel =
    status?.provider === "serpapi" ? "SerpAPI" : "Not configured (demo mode)";

  const quota = status?.serpapi?.monthlyFreeQuota ?? 100;
  const used = status?.serpapi?.usage?.monthlyApiSearches ?? 0;
  const usagePct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const nearLimit = usagePct >= 80;

  const endpoints = [
    { method: "POST", path: "/api/discover", description: "Start a discovery search (Basic or API mode)" },
    { method: "GET", path: "/api/history", description: "List past searches or reopen results by searchId" },
    { method: "POST", path: "/api/validate-email", description: "Validate one email (or bulk, up to 500)" },
    { method: "GET", path: "/api/stats", description: "Dashboard aggregates (profiles, emails, success rate)" },
    { method: "GET", path: "/api/status", description: "Search provider connection + usage status" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">API Access</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Integrate Social Discovery Engine into your workflow.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-white/5 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Search Provider Status */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Search Provider Status</h3>
        <div className="space-y-3">
          {/* Discovery provider */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              {status?.connected ? (
                <CheckCircle size={18} className="text-success" />
              ) : (
                <XCircle size={18} className="text-warning" />
              )}
              <div>
                <div className="text-sm font-medium text-foreground">Discovery (API mode)</div>
                <div className="text-xs text-muted-foreground mt-0.5">{providerLabel}</div>
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                status?.connected ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}
            >
              {loading ? "Checking..." : status?.connected ? "Connected" : "Demo mode"}
            </span>
          </div>

          {/* Email validation */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-success" />
              <div>
                <div className="text-sm font-medium text-foreground">Email Validation (DNS / MX)</div>
                <div className="text-xs text-muted-foreground mt-0.5">No API key required</div>
              </div>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-success/10 text-success">Active</span>
          </div>

          {/* Basic mode (always available) */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-success" />
              <div>
                <div className="text-sm font-medium text-foreground">Basic Mode (DuckDuckGo + Bing)</div>
                <div className="text-xs text-muted-foreground mt-0.5">No API key required · throttled</div>
              </div>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-success/10 text-success">Active</span>
          </div>
        </div>

        {!status?.connected && !loading && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
            To enable live API-mode discovery, add <code className="text-primary">SERPAPI_KEY</code> to{" "}
            <code className="text-primary">.env.local</code> then restart the server. Get a free key at{" "}
            <a
              href="https://serpapi.com/users/sign_up"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              serpapi.com
            </a>
            . Basic mode and email validation don&apos;t need any key.
          </div>
        )}
      </div>

      {/* Usage / Quota */}
      {status?.connected && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">SerpAPI Usage This Month</h3>
            <a
              href="https://serpapi.com/manage-api-key"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View exact usage on SerpAPI
              <ExternalLink size={11} />
            </a>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold text-foreground">
              {used} <span className="text-sm text-muted-foreground font-normal">/ {quota} searches</span>
            </span>
            <span className={`text-xs font-medium ${nearLimit ? "text-warning" : "text-muted-foreground"}`}>
              {usagePct}% of free tier
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${nearLimit ? "bg-warning" : "bg-primary"}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Counted from searches run in <span className="text-foreground font-medium">API mode</span> this
            calendar month. Basic mode (DuckDuckGo/Bing) doesn&apos;t count against this quota.
          </p>

          {nearLimit && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
              <Zap size={14} className="text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                You&apos;re close to your free monthly quota. Upgrade below to avoid interruptions, or switch to
                Basic mode for the rest of the month.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upgrade to a paid plan */}
      <div className="bg-card rounded-xl border border-primary/30 p-5 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Need more searches?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              This app uses your own SerpAPI key, so upgrading is entirely under your control — no changes
              needed here. SerpAPI plans start at 5,000 searches/month; pick one on their pricing page and
              your existing key keeps working automatically once you upgrade.
            </p>
          </div>
          <a
            href="https://serpapi.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Upgrade Plan
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>

      {/* Public API Key (for external tools) */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Public API Key</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Use this key to call Social Discovery Engine from external tools (n8n, Make, Zapier, Python, cURL).
          Send it as <code className="text-primary">Authorization: Bearer &lt;key&gt;</code> or <code className="text-primary">?api_key=&lt;key&gt;</code>.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-10 px-4 bg-background rounded-lg border border-border flex items-center">
            <code className="text-sm text-foreground font-mono">
              {showKey ? apiKey : "sk_live_••••••••••••••••••••••••••••••••"}
            </code>
          </div>
          <button
            onClick={() => setShowKey(!showKey)}
            className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <Copy size={16} />
          </button>
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Available Endpoints</h3>
        <div className="space-y-2">
          {endpoints.map((ep, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              <span
                className={`text-xs font-bold px-2 py-1 rounded ${
                  ep.method === "POST" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                }`}
              >
                {ep.method}
              </span>
              <code className="text-sm font-mono text-foreground flex-1">{ep.path}</code>
              <span className="text-xs text-muted-foreground">{ep.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Example */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Start (External Tools)</h3>
        <div className="bg-background rounded-lg border border-border p-4 overflow-x-auto">
          <pre className="text-sm font-mono text-foreground">
            {`# Discovery search
curl -X POST http://localhost:3000/api/discover \\
  -H "Authorization: Bearer YOUR_PUBLIC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "platform": "linkedin-keyword",
    "keyword": "marketing manager",
    "country": "Colombia",
    "city": "Bogota",
    "mode": "api",
    "maxResults": 20
  }'

# Validate email
curl -X POST http://localhost:3000/api/validate-email \\
  -H "Authorization: Bearer YOUR_PUBLIC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "test@gmail.com" }'

# Google Maps businesses
curl -X POST http://localhost:3000/api/discover \\
  -H "Authorization: Bearer YOUR_PUBLIC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "platform": "gmb-keyword",
    "keyword": "restaurante",
    "country": "Colombia",
    "city": "Medellin",
    "mode": "api"
  }'`}
          </pre>
        </div>
      </div>
    </div>
  );
}
