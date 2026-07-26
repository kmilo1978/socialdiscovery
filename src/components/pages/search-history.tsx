"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Search, Trash2, Eye, Inbox, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchState } from "@/app/page";

interface HistoryRow {
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

interface SearchHistoryProps {
  onViewResults: (data: SearchState) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso.replace(" ", "T") + "Z");
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function SearchHistory({ onViewResults }: SearchHistoryProps) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history?limit=100");
      const data = await res.json();
      setRows(data.searches || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter(
    (r) =>
      r.keyword.toLowerCase().includes(filter.toLowerCase()) ||
      r.searchType.toLowerCase().includes(filter.toLowerCase())
  );

  const viewResults = async (row: HistoryRow) => {
    setLoadingId(row.id);
    try {
      const res = await fetch(`/api/history?searchId=${encodeURIComponent(row.id)}`);
      const data = await res.json();
      onViewResults({
        searchId: row.id,
        leads: data.leads || [],
        queries: [],
        provider: row.provider,
        meta: {
          platform: row.platform,
          keyword: row.keyword,
          country: row.country,
          searchType: row.searchType,
        },
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Search History</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and reopen your past discovery searches.
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

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search through your history..."
          className="w-full h-10 pl-9 pr-4 bg-card rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-4">
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Inbox size={40} className="mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium text-foreground">
            {rows.length === 0 ? "No searches yet" : "No results match your filter"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {rows.length === 0
              ? "Run a discovery search from the sidebar — it will appear here automatically."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Keyword</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Mode</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Leads</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Emails</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Credits</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground font-medium max-w-[200px] truncate">&quot;{item.keyword}&quot;</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-md bg-secondary text-foreground">{item.searchType}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{item.mode}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{item.totalResults.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.emailsFound.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {item.status === "completed" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        Completed
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive"
                        title={item.error}
                      >
                        <AlertCircle size={11} />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.creditsUsed}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.status === "completed" && item.totalResults > 0 && (
                        <button
                          onClick={() => viewResults(item)}
                          disabled={loadingId === item.id}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-white/5 disabled:opacity-50 transition-colors"
                          title="View results"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-white/5 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
