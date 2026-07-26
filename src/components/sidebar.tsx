"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  Camera,
  MessageCircle,
  Globe,
  Briefcase,
  Video,
  Music2,
  Layers,
  Mail,
  CheckCircle,
  FileStack,
  History,
  Download,
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
  Hash,
  AtSign,
  Users,
  UserPlus,
} from "lucide-react";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  {
    id: "discovery",
    label: "Discovery",
    icon: <Search size={18} />,
    children: [
      {
        id: "instagram",
        label: "Instagram",
        icon: <Camera size={16} />,
        children: [
          { id: "instagram-keyword", label: "Keyword", icon: <Hash size={14} /> },
          { id: "instagram-hashtag", label: "Hashtag", icon: <AtSign size={14} /> },
        ],
      },
      {
        id: "twitter",
        label: "X (Twitter)",
        icon: <MessageCircle size={16} />,
        children: [
          { id: "twitter-keyword", label: "Keyword", icon: <Hash size={14} /> },
          { id: "twitter-followers", label: "Followers", icon: <Users size={14} /> },
          { id: "twitter-following", label: "Following", icon: <UserPlus size={14} /> },
        ],
      },
      {
        id: "facebook",
        label: "Facebook",
        icon: <Globe size={16} />,
        children: [
          { id: "facebook-keyword", label: "Keyword", icon: <Hash size={14} /> },
        ],
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        icon: <Briefcase size={16} />,
        children: [
          { id: "linkedin-keyword", label: "Keyword", icon: <Hash size={14} /> },
        ],
      },
      {
        id: "youtube",
        label: "YouTube",
        icon: <Video size={16} />,
        children: [
          { id: "youtube-keyword", label: "Keyword", icon: <Hash size={14} /> },
        ],
      },
      {
        id: "tiktok",
        label: "TikTok",
        icon: <Music2 size={16} />,
        children: [
          { id: "tiktok-keyword", label: "Keyword", icon: <Hash size={14} /> },
        ],
      },
      { id: "multiple-channels", label: "Multiple Channels", icon: <Layers size={16} /> },
    ],
  },
  {
    id: "email-validator",
    label: "Email Validator",
    icon: <Mail size={18} />,
    children: [
      { id: "single-validation", label: "Single Validation", icon: <CheckCircle size={14} /> },
      { id: "bulk-validation", label: "Bulk Validation", icon: <FileStack size={14} /> },
    ],
  },
  { id: "search-history", label: "Search History", icon: <History size={18} /> },
  { id: "exports", label: "Exports", icon: <Download size={18} /> },
];

const bottomNav: NavItem[] = [
  { id: "api", label: "API Access", icon: <Zap size={18} /> },
  { id: "settings", label: "Settings", icon: <Settings size={18} /> },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    discovery: true,
    "email-validator": true,
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (id: string) => currentPage === id;
  const isChildActive = (item: NavItem): boolean => {
    if (isActive(item.id)) return true;
    if (item.children) return item.children.some(isChildActive);
    return false;
  };

  const renderItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expanded[item.id];
    const active = isActive(item.id);
    const childActive = isChildActive(item);

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            } else {
              onNavigate(item.id);
            }
          }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
            "hover:bg-white/5",
            active && "bg-primary/10 text-primary font-medium",
            !active && childActive && "text-foreground",
            !active && !childActive && "text-sidebar-foreground",
            depth === 1 && "pl-8",
            depth === 2 && "pl-12"
          )}
          style={{ paddingLeft: depth > 0 ? `${12 + depth * 16}px` : undefined }}
        >
          <span className={cn("shrink-0", active && "text-primary")}>
            {item.icon}
          </span>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {hasChildren && (
            <span className="text-muted-foreground">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </button>
        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-[240px] h-screen bg-sidebar border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Social Discovery Engine" width={32} height={32} className="rounded-lg" />
          <div>
            <h1 className="text-sm font-semibold text-foreground">Social</h1>
            <p className="text-[11px] text-muted-foreground -mt-0.5">Discovery Engine</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navigation.map((item) => renderItem(item))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-border space-y-0.5">
        <button
          onClick={() => onNavigate("api")}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            "bg-primary hover:bg-primary/90 text-white",
            isActive("api") && "ring-2 ring-primary/50"
          )}
        >
          <Zap size={16} />
          API Access
        </button>
        <button
          onClick={() => onNavigate("settings")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
            "hover:bg-white/5 text-sidebar-foreground",
            isActive("settings") && "bg-primary/10 text-primary font-medium"
          )}
        >
          <Settings size={18} />
          Settings
        </button>
      </div>
    </aside>
  );
}
