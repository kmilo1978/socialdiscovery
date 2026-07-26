"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Download,
  Search,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Inbox,
  Loader2,
  Mail,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { SearchState } from "@/app/page";
import type { Lead } from "@/lib/extractors";

interface ResultsPageProps {
  data: SearchState;
  onBack: () => void;
}

function toCSV(leads: Lead[], meta: SearchState["meta"]): string {
  // Matches the expected SocLeads-style export columns.
  const headers = ["Email", "Name", "HomePage", "Tel", "Search term", "Search type", "Search location"];
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = leads.map((l) =>
    [
      l.email === "—" ? "" : l.email,
      l.description === "—" ? l.name : l.description,
      l.profileUrl,
      l.phone === "—" ? "" : l.phone,
      meta.keyword,
      meta.searchType,
      meta.country && meta.country !== "All Countries" ? meta.country : "",
    ]
      .map(esc)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function ResultsPage({ data, onBack }: ResultsPageProps) {
  const { addToast } = useToast();
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [leads, setLeads] = useState<Lead[]>(data.leads);
  const [verifying, setVerifying] = useState<string[]>([]);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [demoBlur, setDemoBlur] = useState(false);

  const filteredResults = leads.filter((r) => {
    const q = searchFilter.toLowerCase();
    const matchesSearch =
      r.email.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleAll = () => {
    if (selected.length === filteredResults.length) setSelected([]);
    else setSelected(filteredResults.map((r) => r.id));
  };

  // --- Copy helpers ---
  const copyText = async (text: string, id: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
      addToast({ type: "success", title: label });
    } catch {
      addToast({ type: "error", title: "Could not copy" });
    }
  };

  const copyAllEmails = () => {
    const source = selected.length > 0 ? leads.filter((l) => selected.includes(l.id)) : filteredResults;
    const emails = source.map((l) => l.email).filter((e) => e && e !== "—");
    if (emails.length === 0) {
      addToast({ type: "warning", title: "No emails to copy" });
      return;
    }
    copyText(emails.join("\n"), "all-emails", `${emails.length} emails copied`);
  };

  // --- Export ---
  const handleExport = () => {
    const toExport = selected.length > 0 ? leads.filter((r) => selected.includes(r.id)) : filteredResults;
    if (toExport.length === 0) {
      addToast({ type: "warning", title: "Nothing to export" });
      return;
    }
    const csv = toCSV(toExport, data.meta);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    a.download = `${ts} ${data.meta.searchType} ${data.meta.keyword}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: "success", title: `Exported ${toExport.length} rows`, description: "CSV downloaded" });
  };

  // --- Verify (inline, real DNS/MX) ---
  const verifyOne = async (lead: Lead) => {
    if (!lead.email || lead.email === "—") {
      addToast({ type: "warning", title: "No email to verify" });
      return;
    }
    setVerifying((prev) => [...prev, lead.id]);
    try {
      const res = await fetch("/api/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lead.email }),
      });
      const v = await res.json();
      if (res.ok) {
        const newStatus: Lead["status"] =
          v.status === "accepted" ? "verified" : v.status === "limited" ? "pending" : "unverified";
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? { ...l, status: newStatus, leadScore: Math.max(l.leadScore, v.confidence) }
              : l
          )
        );
      }
    } catch {
      addToast({ type: "error", title: "Verification failed" });
    } finally {
      setVerifying((prev) => prev.filter((id) => id !== lead.id));
    }
  };

  const verifyAll = async () => {
    const targets = (selected.length > 0 ? leads.filter((l) => selected.includes(l.id)) : filteredResults).filter(
      (l) => l.email && l.email !== "—"
    );
    if (targets.length === 0) {
      addToast({ type: "warning", title: "No emails to verify" });
      return;
    }
    setVerifyingAll(true);
    addToast({ type: "info", title: `Verifying ${targets.length} emails...` });
    // Verify in small batches to avoid hammering DNS
    for (let i = 0; i < targets.length; i += 5) {
      const batch = targets.slice(i, i + 5);
      await Promise.all(batch.map((l) => verifyOne(l)));
    }
    setVerifyingAll(false);
    addToast({ type: "success", title: "Verification complete" });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle size={13} className="text-success" />;
      case "pending":
        return <Clock size={13} className="text-warning" />;
      default:
        return <XCircle size={13} className="text-destructive" />;
    }
  };
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 75) return "text-primary";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const emailCount = leads.filter((l) => l.email && l.email !== "—").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Search Results</h2>
            <p className="text-xs text-muted-foreground">
              {leads.length} results · {emailCount} with email · {data.meta.keyword ? `"${data.meta.keyword}"` : ""} ·{" "}
              {data.meta.searchType}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <span className="text-xs text-primary font-medium mr-1">{selected.length} selected</span>
          )}
          <button
            onClick={verifyAll}
            disabled={verifyingAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-white/5 disabled:opacity-60 transition-colors"
          >
            {verifyingAll ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Verify {selected.length > 0 ? "Selected" : "All"}
          </button>
          <button
            onClick={copyAllEmails}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-white/5 transition-colors"
          >
            <Copy size={14} />
            Copy Emails
          </button>
          <button
            onClick={() => setDemoBlur(!demoBlur)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              demoBlur ? "border-warning bg-warning/10 text-warning" : "border-border text-foreground hover:bg-white/5"
            }`}
            title="Blur sensitive data for demos/screenshots"
          >
            <EyeOff size={14} />
            {demoBlur ? "Blur ON" : "Blur"}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Demo notice */}
      {data.provider === "demo" && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20">
          <Inbox size={15} className="text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-warning font-medium">Demo data.</span> These are sample results in the
            real export format. Add <code className="text-primary">SERPAPI_KEY</code> to{" "}
            <code className="text-primary">.env.local</code> to fetch live footprint results, or switch to
            Basic mode (no key needed). Verify and Export work on this data too.
          </p>
        </div>
      )}

      {/* Footprint queries */}
      {data.queries?.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground mb-1.5">Footprint queries used:</div>
          <div className="flex flex-wrap gap-2">
            {data.queries.map((q, i) => (
              <code key={i} className="text-[11px] px-2 py-1 rounded bg-background border border-border text-primary font-mono">
                {q}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by email, caption, username..."
            className="w-full h-9 pl-9 pr-4 bg-card rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 bg-card rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        >
          <option value="all">All Status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {/* Empty state */}
      {filteredResults.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Inbox size={40} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium text-foreground">No results match your filter</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Try a broader keyword or disable &quot;Require Email&quot; in the search form.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.length === filteredResults.length && filteredResults.length > 0}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded border-border bg-background accent-primary"
                    />
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name / Caption</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Followers</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tel</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => {
                  const isVerifying = verifying.includes(result.id);
                  const hasEmail = result.email && result.email !== "—";
                  return (
                    <tr key={result.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(result.id)}
                          onChange={() => toggleSelect(result.id)}
                          className="w-3.5 h-3.5 rounded border-border bg-background accent-primary"
                        />
                      </td>
                      {/* Email + inline copy */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-muted-foreground shrink-0" />
                          <span className={`text-sm text-foreground font-medium truncate max-w-[200px] ${demoBlur ? "blur-sm select-none" : ""}`}>
                            {result.email}
                          </span>
                          {hasEmail && (
                            <button
                              onClick={() => copyText(result.email, result.id, "Email copied")}
                              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                              title="Copy email"
                            >
                              {copiedId === result.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                            </button>
                          )}
                        </div>
                      </td>
                      {/* Caption */}
                      <td className="px-3 py-3">
                        <span className={`text-sm text-muted-foreground line-clamp-2 max-w-[280px] block ${demoBlur ? "blur-sm select-none" : ""}`}>
                          {result.description}
                        </span>
                      </td>
                      {/* Source link */}
                      <td className="px-3 py-3">
                        <a
                          href={result.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline max-w-[160px] truncate"
                          title={result.profileUrl}
                        >
                          <span className="truncate">{result.platform}</span>
                          <ExternalLink size={11} className="shrink-0" />
                        </a>
                      </td>
                      {/* Followers */}
                      <td className="px-3 py-3">
                        <span className={`text-sm ${result.followers && result.followers !== "—" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {result.followers}
                        </span>
                      </td>
                      {/* Tel */}
                      <td className={`px-3 py-3 text-sm text-muted-foreground ${demoBlur ? "blur-sm select-none" : ""}`}>{result.phone}</td>
                      {/* Status */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(result.status)}
                          <span className="text-xs capitalize text-muted-foreground">{result.status}</span>
                        </div>
                      </td>
                      {/* Score */}
                      <td className="px-3 py-3">
                        <span className={`text-sm font-bold ${getScoreColor(result.leadScore)}`}>{result.leadScore}</span>
                      </td>
                      {/* Actions: Verify + Copy + Open */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => verifyOne(result)}
                            disabled={isVerifying || !hasEmail}
                            className="flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Verify email (real MX check)"
                          >
                            {isVerifying ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                            Verify
                          </button>
                          <button
                            onClick={() => copyText(result.email, result.id, "Email copied")}
                            disabled={!hasEmail}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-40 transition-colors"
                            title="Copy email"
                          >
                            {copiedId === result.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                          </button>
                          <a
                            href={result.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                            title="Open source"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredResults.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Showing {filteredResults.length} of {leads.length} results
          </span>
        </div>
      )}
    </div>
  );
}
