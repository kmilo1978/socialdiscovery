"use client";

import { Search, Bell, HelpCircle } from "lucide-react";

interface TopBarProps {
  currentPage: string;
}

const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  "instagram-keyword": "Instagram · Keyword",
  "instagram-hashtag": "Instagram · Hashtag",
  "twitter-keyword": "X (Twitter) · Keyword",
  "twitter-followers": "X (Twitter) · Followers",
  "twitter-following": "X (Twitter) · Following",
  "facebook-keyword": "Facebook · Keyword",
  "linkedin-keyword": "LinkedIn · Keyword",
  "youtube-keyword": "YouTube · Keyword",
  "tiktok-keyword": "TikTok · Keyword",
  "multiple-channels": "Multiple Channels",
  "email-validator": "Email Validator",
  "single-validation": "Single Validation",
  "bulk-validation": "Bulk Validation",
  "search-history": "Search History",
  exports: "Exports",
  api: "API Access",
  settings: "Settings",
};

export function TopBar({ currentPage }: TopBarProps) {
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="relative w-[400px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search profiles, keywords, or emails..."
          className="w-full h-9 pl-9 pr-4 bg-secondary rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
        />
      </div>

      {/* Breadcrumb */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {pageTitles[currentPage] || "Discovery"}
        </span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <Bell size={18} />
        </button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <HelpCircle size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-medium">
          SD
        </div>
      </div>
    </header>
  );
}
