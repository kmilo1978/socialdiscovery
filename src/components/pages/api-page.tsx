"use client";

import { useState, useEffect } from "react";
import { Copy, Eye, EyeOff, RefreshCw, Code, Zap, Shield, Activity, CheckCircle, XCircle } from "lucide-react";

interface ProviderStatus {
  provider: string;
  connected: boolean;
  google: { hasKey: boolean; hasCx: boolean };
  serpapi: { hasKey: boolean };
  emailValidation: boolean;
}

export function ApiPage() {
  const [showKey, setShowKey] = useState(false);
  const apiKey = "sk_live_4f7cff_a8b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
  const [status, setStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const providerLabel =
    status?.provider === "google_cse"
      ? "Google Custom Search"
      : status?.provider === "serpapi"
      ? "SerpAPI"
      : "Not configured (demo mode)";

  const endpoints = [
    { method: "POST", path: "/api/v1/discover", description: "Start a new discovery search" },
    { method: "GET", path: "/api/v1/results/{id}", description: "Get search results by ID" },
    { method: "POST", path: "/api/v1/validate", description: "Validate a single email" },
    { method: "POST", path: "/api/v1/validate/bulk", description: "Validate emails in bulk" },
    { method: "GET", path: "/api/v1/credits", description: "Get remaining credits" },
    { method: "GET", path: "/api/v1/history", description: "Get search history" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">API Access</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Integrate Social Discovery Engine into your workflow.
        </p>
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
                <div className="text-sm font-medium text-foreground">Discovery (Google Footprints)</div>
                <div className="text-xs text-muted-foreground mt-0.5">{providerLabel}</div>
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                status?.connected ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}
            >
              {status === null ? "Checking..." : status.connected ? "Connected" : "Demo mode"}
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
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-success/10 text-success">
              Active
            </span>
          </div>
        </div>

        {!status?.connected && status !== null && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
            To enable live discovery, add <code className="text-primary">GOOGLE_CSE_KEY</code> and{" "}
            <code className="text-primary">GOOGLE_CSE_CX</code> to <code className="text-primary">.env.local</code>{" "}
            then restart the server. See the README for the step-by-step guide.
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Zap size={14} />
            <span className="text-xs uppercase tracking-wider">Plan</span>
          </div>
          <div className="text-lg font-bold text-foreground">Pro</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity size={14} />
            <span className="text-xs uppercase tracking-wider">Requests Today</span>
          </div>
          <div className="text-lg font-bold text-foreground">1,247</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Shield size={14} />
            <span className="text-xs uppercase tracking-wider">Rate Limit</span>
          </div>
          <div className="text-lg font-bold text-foreground">100/min</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Code size={14} />
            <span className="text-xs uppercase tracking-wider">Version</span>
          </div>
          <div className="text-lg font-bold text-foreground">v1.4</div>
        </div>
      </div>

      {/* API Key */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">API Key</h3>
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
          <button className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Keep your API key secret. Never share it in client-side code.
        </p>
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
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                ep.method === "POST" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
              }`}>
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
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Start</h3>
        <div className="bg-background rounded-lg border border-border p-4 overflow-x-auto">
          <pre className="text-sm font-mono text-foreground">
{`curl -X POST https://api.socialdiscovery.io/v1/discover \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "platform": "linkedin",
    "keyword": "SaaS founders",
    "country": "US",
    "max_results": 1000
  }'`}
          </pre>
        </div>
      </div>
    </div>
  );
}
