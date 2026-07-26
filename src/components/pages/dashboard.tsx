"use client";

import {
  Users,
  AtSign,
  CheckCircle2,
  TrendingUp,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  MoreVertical,
  RefreshCw,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const stats = [
  {
    label: "Profiles Found",
    value: "124.5k",
    change: "+12.3%",
    trend: "up",
    icon: <Users size={18} />,
    color: "text-primary",
  },
  {
    label: "Emails Found",
    value: "82.1k",
    change: "+8.7%",
    trend: "up",
    icon: <AtSign size={18} />,
    color: "text-primary",
  },
  {
    label: "Validated",
    value: "76.4k",
    change: "Stable",
    trend: "neutral",
    icon: <CheckCircle2 size={18} />,
    color: "text-success",
  },
  {
    label: "Success Rate",
    value: "93.2%",
    change: "-2.1%",
    trend: "down",
    icon: <TrendingUp size={18} />,
    color: "text-warning",
  },
  {
    label: "Credits Used",
    value: "14.8k",
    change: "Budget: 60k",
    trend: "neutral",
    icon: <Coins size={18} />,
    color: "text-purple-400",
  },
];

const chartData = [
  { name: "Mon", LinkedIn: 320, Twitter: 180 },
  { name: "Tue", LinkedIn: 450, Twitter: 280 },
  { name: "Wed", LinkedIn: 280, Twitter: 350 },
  { name: "Thu", LinkedIn: 520, Twitter: 290 },
  { name: "Fri", LinkedIn: 380, Twitter: 420 },
  { name: "Sat", LinkedIn: 190, Twitter: 150 },
  { name: "Sun", LinkedIn: 420, Twitter: 380 },
];

const recentSearches = [
  {
    query: '"Fullstack Developers New York"',
    source: "LinkedIn",
    leads: 1245,
    status: "Completed",
    date: "Oct 24, 2:40 PM",
  },
  {
    query: '"AI Startup Founders"',
    source: "X (Twitter)",
    leads: 842,
    status: "Processing",
    date: "Oct 24, 1:15 PM",
  },
  {
    query: '"Marketing Agency Owners"',
    source: "Facebook",
    leads: 2109,
    status: "Completed",
    date: "Oct 23, 11:30 AM",
  },
  {
    query: '"E-commerce Managers London"',
    source: "TikTok",
    leads: 432,
    status: "Failed",
    date: "Oct 23, 09:12 AM",
  },
];

const jobs = [
  { name: "LinkedIn SaaS Founders", progress: 82, leads: "3.2k/4.5k", time: "Est. 12m left" },
  { name: "Twitter Crypto Hub", progress: 45, leads: "1.2k/2.5k", time: "Est. 45m left" },
  { name: "IG Boutique Reach", progress: 0, leads: "", time: "Pending start..." },
];

export function Dashboard() {
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
            Last 30 Days
          </button>
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
            + New Discovery
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        {stats.map((stat) => (
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
            <div className="flex items-center gap-1 mt-1">
              {stat.trend === "up" && <ArrowUpRight size={12} className="text-success" />}
              {stat.trend === "down" && <ArrowDownRight size={12} className="text-destructive" />}
              <span
                className={`text-xs ${
                  stat.trend === "up"
                    ? "text-success"
                    : stat.trend === "down"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Jobs */}
      <div className="grid grid-cols-3 gap-4">
        {/* Chart */}
        <div className="col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Discovery Trends</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Lead volume across all channels</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                LinkedIn
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                Twitter
              </span>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2035" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#12131f",
                    border: "1px solid #1e2035",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "rgba(79, 124, 255, 0.05)" }}
                />
                <Bar dataKey="LinkedIn" fill="#4F7CFF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Twitter" fill="#3a3b5c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Jobs in Execution */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Jobs in Execution</h3>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.name} className="p-3 rounded-lg border border-border bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground truncate">{job.name}</span>
                  <span className={`text-xs font-medium ${job.progress > 0 ? "text-success" : "text-muted-foreground"}`}>
                    {job.progress > 0 ? `${job.progress}%` : "Queued"}
                  </span>
                </div>
                {job.progress > 0 && (
                  <div className="w-full h-1.5 rounded-full bg-secondary mb-2">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{job.leads || "—"}</span>
                  <span>{job.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Searches */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent Searches</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Quick access to your discovery history</p>
          </div>
          <button className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
            View All History
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Search Query
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Source
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Leads Found
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {recentSearches.map((search, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground font-medium">{search.query}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{search.source}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{search.leads.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        search.status === "Completed"
                          ? "text-success"
                          : search.status === "Processing"
                          ? "text-primary"
                          : "text-destructive"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          search.status === "Completed"
                            ? "bg-success"
                            : search.status === "Processing"
                            ? "bg-primary"
                            : "bg-destructive"
                        }`}
                      />
                      {search.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{search.date}</td>
                  <td className="px-4 py-3 text-right">
                    {search.status === "Completed" ? (
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Download size={14} />
                      </button>
                    ) : search.status === "Failed" ? (
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <RefreshCw size={14} />
                      </button>
                    ) : (
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <MoreVertical size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
