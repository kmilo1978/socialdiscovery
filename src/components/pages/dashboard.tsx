"use client";

import { useEffect, useState } from "react";
import {
  Users,
  AtSign,
  CheckCircle2,
  TrendingUp,
  Coins,
  Download,
  RefreshCw,
  Calendar,
  Inbox,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchRow {
  id: string;
  platform: string;
  keyword: string;
  searchType: string;
  status: "completed" | "failed" | "processing";
  totalResults: number;
  emailsFound: number;
  creditsUsed: number;
  createdAt: string;
}

interface DashboardStats {
  profilesFound: number;
  emailsFound: number;
  emailsValidated: number;
  emailsAccepted: number;
  successRate: number;
  creditsUsed: number;
  searchesToday: number;
  searchesLast7Days: number;
  trend: Array<{ day: string; count: number }>;
  recentSearches: SearchRow[];
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso.replace(" ", "T") + "Z");
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json().catch(() => null);
      if (data) setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statCards = stats
    ? [
        { label: "Profiles Found", value: formatCompact(stats.profilesFound), icon: <Users size={18} />, color: "text-primary" },
        { label: "Emails Found", value: formatCompact(stats.emailsFound), icon: <AtSign size={18} />, color: "text-primary" },
        { label: "Emails Validated", value: formatCompact(stats.emailsValidated), icon: <CheckCircle2 size={18} />, color: "text-success" },
        { label: "Success Rate", value: `${stats.successRate}%`, icon: <TrendingUp size={18} />, color: "text-warning" },
        { label: "Credits Used", value: formatCompact(stats.creditsUsed), icon: <Coins size={18} />, color: "text-purple-400" },
      ]
    : [];

  const chartData = stats?.trend.map((t) => ({ name: formatDay(t.day), leads: t.count })) || [];
  const hasAnyData = stats && stats.recentSearches.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Discovery Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tracking performance across all social signals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-white/5 transition-colors">
            <Calendar size={14} />
            Last 7 Days
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))
          : statCards.map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <span className={stat.color}>{stat.icon}</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </div>
            ))}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Discovery Trends</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Leads found per day (last 7 days)</p>
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2035" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#12131f", border: "1px solid #1e2035", borderRadius: "8px", fontSize: "12px" }}
                  cursor={{ fill: "rgba(79, 124, 255, 0.05)" }}
                />
                <Bar dataKey="leads" fill="#4F7CFF" radius={[4, 4, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Searches */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent Searches</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Your last 5 discovery runs</p>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-[160px] w-full" />
        ) : !hasAnyData ? (
          <div className="py-10 text-center">
            <Inbox size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-foreground font-medium">No searches yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run a discovery search and it will show up here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Keyword</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Leads</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats!.recentSearches.map((search) => (
                  <tr key={search.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground font-medium">&quot;{search.keyword}&quot;</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{search.searchType}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{search.totalResults.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          search.status === "completed" ? "text-success" : "text-destructive"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${search.status === "completed" ? "bg-success" : "bg-destructive"}`} />
                        {search.status === "completed" ? "Completed" : "Failed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(search.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
