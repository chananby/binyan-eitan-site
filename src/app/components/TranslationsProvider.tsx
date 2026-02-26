"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import defaultTranslations from "@/src/lib/translations.json";

type TranslationsData = typeof defaultTranslations;
type SectionKey = keyof TranslationsData;
type LangKey = "en" | "he";

const TranslationsContext = createContext<TranslationsData>(defaultTranslations);

export function TranslationsProvider({ children }: { children: React.ReactNode }) {
  const [translations, setTranslations] = useState<TranslationsData>(defaultTranslations);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const res = await fetch("/api/translations", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === "object") {
            setTranslations(data);
          }
        }
      } catch (err) {
        console.error("Failed to load translations:", err);
      }
    };

    loadTranslations();

    // Refetch translations every 30 seconds to ensure we have the latest content
    const interval = setInterval(loadTranslations, 30000);
    
    // Also refetch when page becomes visible (user returns from another tab)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadTranslations();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <TranslationsContext.Provider value={translations}>
      {children}
    </TranslationsContext.Provider>
  );
}

export function useTranslations<S extends SectionKey>(
  section: S,
  lang: LangKey
): TranslationsData[S][LangKey] {
  const translations = useContext(TranslationsContext);
  return translations[section]?.[lang] ?? ({} as TranslationsData[S][LangKey]);
}
