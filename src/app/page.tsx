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

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSearchResults(null);
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
          <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar currentPage={currentPage} />
            <main className="flex-1 overflow-y-auto p-6">
              {renderPage()}
            </main>
            <footer className="h-10 border-t border-border bg-background/50 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
                <span>API Docs</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                System Status: All Systems Operational
              </div>
            </footer>
          </div>
        </div>
      </ToastProvider>
    </I18nProvider>
  );
}
