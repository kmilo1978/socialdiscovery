"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { en, type Translations } from "./en";
import { es } from "./es";
import { pt } from "./pt";
import React from "react";

export type Locale = "en" | "es" | "pt";

const LOCALES: Record<Locale, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇺🇸" },
  es: { label: "Español", flag: "🇪🇸" },
  pt: { label: "Português", flag: "🇧🇷" },
};

const TRANSLATIONS: Record<Locale, Translations> = { en, es, pt };

export { LOCALES, TRANSLATIONS };
export type { Translations };

// ---------------------------------------------------------------------------
// Context + Provider
// ---------------------------------------------------------------------------

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

const STORAGE_KEY = "sd_locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Load saved locale on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved in TRANSLATIONS) {
        setLocaleState(saved as Locale);
      }
    } catch {
      // SSR or storage blocked — keep default.
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const t = TRANSLATIONS[locale];

  return React.createElement(I18nContext.Provider, { value: { locale, setLocale, t } }, children);
}

/**
 * Hook to access translations and the current locale.
 * Usage: const { t, locale, setLocale } = useI18n();
 */
export function useI18n() {
  return useContext(I18nContext);
}
