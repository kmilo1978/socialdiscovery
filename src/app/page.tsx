"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { Dashboard } from "@/components/pages/dashboard";
import { DiscoveryPage } from "@/components/pages/discovery";
import { EmailValidator } from "@/components/pages/email-validator";
import { SearchHistory } from "@/components/pages/search-history";
import { ExportsPage } from "@/components/pages/exports";
import { ResultsPage } from "@/components/pages/results";
import { ApiPage } from "@/components/pages/api-page";
import { SettingsPage } from "@/components/pages/settings";
import { ToastProvider } from "@/components/ui/toast";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { I18nProvider } from "@/lib/i18n";
import type { Lead } from "@/lib/extractors";

export interface SearchState {
  searchId?: string;
  leads: Lead[];
  queries: string[];
  provider: string;
  meta: { platform: string; keyword: string; country: string; searchType: string };
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [searchResults, setSearchResults] = useState<SearchState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSearchResults(null);
    setSidebarOpen(false); // close mobile sidebar on navigate
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 400);
  };

  const renderPage = () => {
    if (isLoading) {
      return <DashboardSkeleton />;
    }

    if (searchResults) {
      return <ResultsPage data={searchResults} onBack={() => setSearchResults(null)} />;
    }

    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "email-validator":
      case "single-validation":
      case "bulk-validation":
        return <EmailValidator mode={currentPage === "bulk-validation" ? "bulk" : "single"} />;
      case "search-history":
        return <SearchHistory onViewResults={(data) => setSearchResults(data)} />;
      case "exports":
        return <ExportsPage />;
      case "api":
        return <ApiPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return (
          <DiscoveryPage
            platform={currentPage}
            onResults={(data) => setSearchResults(data)}
          />
        );
    }
  };

  return (
    <I18nProvider>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar: hidden on mobile, slides in when open */}
          <div
            className={`
              fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
              transform transition-transform duration-200 ease-in-out
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}
          >
            <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden w-full">
            <TopBar currentPage={currentPage} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {renderPage()}
            </main>
            <footer className="h-auto min-h-[40px] border-t border-border bg-background/50 flex flex-col sm:flex-row items-center justify-between px-4 md:px-6 py-2 gap-1 shrink-0">
              <div className="flex items-center gap-3 md:gap-4 text-xs text-muted-foreground flex-wrap">
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
                <a href="https://localrank.com.co" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  by localrank.com.co
                </a>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                All Systems Operational
              </div>
            </footer>
          </div>
        </div>
      </ToastProvider>
    </I18nProvider>
  );
}
