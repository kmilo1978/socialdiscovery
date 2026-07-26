"use client";

import { Search, Bell, HelpCircle, Menu } from "lucide-react";

interface TopBarProps {
  currentPage: string;
  onMenuToggle?: () => void;
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

export function TopBar({ currentPage, onMenuToggle }: TopBarProps) {
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 shrink-0 gap-3">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors shrink-0"
      >
        <Menu size={20} />
      </button>

      {/* Page title (mobile) / Search (desktop) */}
      <div className="flex-1 min-w-0">
        {/* Mobile: page title */}
        <span className="lg:hidden text-sm font-medium text-foreground truncate block">
          {pageTitles[currentPage] || "Discovery"}
        </span>
        {/* Desktop: search bar */}
        <div className="hidden lg:block relative max-w-[400px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search profiles, keywords, or emails..."
            className="w-full h-9 pl-9 pr-4 bg-secondary rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <Bell size={18} />
        </button>
        <button className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <HelpCircle size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-medium">
          SD
        </div>
      </div>
    </header>
  );
}
