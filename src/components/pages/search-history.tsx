"use client";

import { Download, RefreshCw, Trash2, Search, Filter, Calendar } from "lucide-react";

const historyData = [
  { id: 1, query: '"Fullstack Developers New York"', source: "LinkedIn", type: "Keyword", leads: 1245, status: "Completed", credits: 187, date: "Oct 24, 2:40 PM" },
  { id: 2, query: '"AI Startup Founders"', source: "X (Twitter)", type: "Keyword", leads: 842, status: "Completed", credits: 126, date: "Oct 24, 1:15 PM" },
  { id: 3, query: '"Marketing Agency Owners"', source: "Facebook", type: "Keyword", leads: 2109, status: "Completed", credits: 316, date: "Oct 23, 11:30 AM" },
  { id: 4, query: '"E-commerce Managers London"', source: "TikTok", type: "Keyword", leads: 432, status: "Failed", credits: 0, date: "Oct 23, 09:12 AM" },
  { id: 5, query: '#SaaS', source: "Instagram", type: "Hashtag", leads: 3521, status: "Completed", credits: 528, date: "Oct 22, 4:20 PM" },
  { id: 6, query: '"React Developers Remote"', source: "LinkedIn", type: "Keyword", leads: 956, status: "Completed", credits: 143, date: "Oct 22, 2:00 PM" },
  { id: 7, query: '"Crypto Influencers"', source: "YouTube", type: "Keyword", leads: 1890, status: "Completed", credits: 283, date: "Oct 21, 10:30 AM" },
  { id: 8, query: '@elonmusk followers', source: "X (Twitter)", type: "Followers", leads: 5000, status: "Completed", credits: 750, date: "Oct 20, 3:45 PM" },
];

export function SearchHistory() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Search History</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and manage all your past discovery searches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-white/5 transition-colors">
            <Calendar size={14} />
            Date Range
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-white/5 transition-colors">
            <Filter size={14} />
            Filters
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search through your history..."
          className="w-full h-10 pl-9 pr-4 bg-card rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Query</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Leads</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Credits</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {historyData.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm text-foreground font-medium max-w-[200px] truncate">{item.query}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.source}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-md bg-secondary text-foreground">{item.type}</span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{item.leads.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    item.status === "Completed" ? "text-success" : "text-destructive"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.status === "Completed" ? "bg-success" : "bg-destructive"
                    }`} />
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.credits}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.date}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {item.status === "Completed" && (
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                        <Download size={14} />
                      </button>
                    )}
                    {item.status === "Failed" && (
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                        <RefreshCw size={14} />
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
    </div>
  );
}
