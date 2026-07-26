"use client";

import { useState } from "react";
import {
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Globe,
  Server,
  Trash2,
  UserCheck,
  Inbox,
  Cloud,
  TrendingUp,
  Upload,
  FileSpreadsheet,
} from "lucide-react";

interface EmailValidatorProps {
  mode?: "single" | "bulk";
}

interface ValidationResult {
  email: string;
  status: "accepted" | "limited" | "rejected";
  syntax: boolean;
  domain: boolean;
  mx: boolean;
  disposable: boolean;
  role: boolean;
  catchAll: boolean;
  provider: string;
  confidence: number;
  date: string;
}

const mockHistory: ValidationResult[] = [
  {
    email: "john@google.com",
    status: "accepted",
    syntax: true,
    domain: true,
    mx: true,
    disposable: false,
    role: false,
    catchAll: false,
    provider: "Google Workspace",
    confidence: 99,
    date: "Oct 24, 2:40 PM",
  },
  {
    email: "test@tempmail.org",
    status: "rejected",
    syntax: true,
    domain: true,
    mx: true,
    disposable: true,
    role: false,
    catchAll: true,
    provider: "TempMail",
    confidence: 5,
    date: "Oct 24, 2:38 PM",
  },
  {
    email: "info@company.co",
    status: "limited",
    syntax: true,
    domain: true,
    mx: true,
    disposable: false,
    role: true,
    catchAll: false,
    provider: "Microsoft 365",
    confidence: 65,
    date: "Oct 24, 2:35 PM",
  },
  {
    email: "sarah@startup.io",
    status: "accepted",
    syntax: true,
    domain: true,
    mx: true,
    disposable: false,
    role: false,
    catchAll: false,
    provider: "Google Workspace",
    confidence: 97,
    date: "Oct 24, 2:30 PM",
  },
];

export function EmailValidator({ mode = "single" }: EmailValidatorProps) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [history, setHistory] = useState<ValidationResult[]>(mockHistory);

  const handleValidate = async () => {
    if (!email) return;
    setIsValidating(true);
    try {
      const res = await fetch("/api/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIsValidating(false);
        return;
      }
      const validated: ValidationResult = {
        email: data.email,
        status: data.status,
        syntax: data.syntax,
        domain: data.domain,
        mx: data.mx,
        disposable: data.disposable,
        role: data.role,
        catchAll: data.catchAll,
        provider: data.provider,
        confidence: data.confidence,
        date: "Just now",
      };
      setResult(validated);
      setHistory((prev) => [validated, ...prev].slice(0, 20));
    } catch {
      // network error - ignore, could add toast
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-sm font-medium">
            <CheckCircle size={14} />
            Accepted
          </span>
        );
      case "limited":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-sm font-medium">
            <AlertCircle size={14} />
            Limited
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
            <XCircle size={14} />
            Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {mode === "bulk" ? "Bulk Email Validation" : "Email Validator"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "bulk"
            ? "Upload a CSV file to validate emails in bulk."
            : "Validate an email address instantly with deep verification."}
        </p>
      </div>

      {mode === "bulk" ? (
        /* Bulk Upload */
        <div className="bg-card rounded-xl border border-border p-8">
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload size={40} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">
              Drag & Drop your CSV file here
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              or click to browse. Max 50,000 emails per file.
            </p>
            <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              <FileSpreadsheet size={14} className="inline mr-2" />
              Select CSV File
            </button>
          </div>
        </div>
      ) : (
        /* Single Validation */
        <>
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                  placeholder="Enter an email address to validate..."
                  className="w-full h-12 pl-10 pr-4 bg-background rounded-lg border border-border text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
              <button
                onClick={handleValidate}
                disabled={isValidating || !email}
                className="h-12 px-6 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isValidating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    Validate
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {/* Status */}
              <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      result.status === "accepted"
                        ? "bg-success/10"
                        : result.status === "limited"
                        ? "bg-warning/10"
                        : "bg-destructive/10"
                    }`}
                  >
                    {result.status === "accepted" ? (
                      <CheckCircle size={24} className="text-success" />
                    ) : result.status === "limited" ? (
                      <AlertCircle size={24} className="text-warning" />
                    ) : (
                      <XCircle size={24} className="text-destructive" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{result.email}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Validated just now</div>
                  </div>
                </div>
                {getStatusBadge(result.status)}
              </div>

              {/* Verification Cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Syntax", value: result.syntax, icon: <Shield size={16} /> },
                  { label: "Domain", value: result.domain, icon: <Globe size={16} /> },
                  { label: "MX Record", value: result.mx, icon: <Server size={16} /> },
                  { label: "Disposable", value: !result.disposable, icon: <Trash2 size={16} />, invert: true },
                  { label: "Role Account", value: !result.role, icon: <UserCheck size={16} />, invert: true },
                  { label: "Catch-All", value: !result.catchAll, icon: <Inbox size={16} />, invert: true },
                  { label: "Provider", value: result.provider, icon: <Cloud size={16} />, isText: true },
                  { label: "Confidence", value: result.confidence, icon: <TrendingUp size={16} />, isScore: true },
                ].map((check) => (
                  <div
                    key={check.label}
                    className="bg-card rounded-xl border border-border p-4 flex flex-col items-center gap-2"
                  >
                    <span className="text-muted-foreground">{check.icon}</span>
                    <span className="text-xs text-muted-foreground">{check.label}</span>
                    {check.isText ? (
                      <span className="text-sm font-medium text-foreground">{check.value}</span>
                    ) : check.isScore ? (
                      <span className={`text-lg font-bold ${Number(check.value) >= 80 ? "text-success" : Number(check.value) >= 50 ? "text-warning" : "text-destructive"}`}>
                        {check.value}%
                      </span>
                    ) : (
                      <span>
                        {check.value ? (
                          <CheckCircle size={18} className="text-success" />
                        ) : (
                          <XCircle size={18} className="text-destructive" />
                        )}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Validation History */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Validation History</h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Confidence</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground font-medium">{item.email}</td>
                  <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.provider}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${item.confidence >= 80 ? "text-success" : item.confidence >= 50 ? "text-warning" : "text-destructive"}`}>
                      {item.confidence}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
