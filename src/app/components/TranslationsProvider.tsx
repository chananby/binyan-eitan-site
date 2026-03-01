"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import defaultTranslations from "@/src/lib/translations.json";

type TranslationsData = typeof defaultTranslations;
type LangKey = "en" | "he";

// Only sections that follow the {en: {...}, he: {...}} shape
type LocalizedSection = {
  [K in keyof TranslationsData]: TranslationsData[K] extends { en: object; he: object } ? K : never;
}[keyof TranslationsData];

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

    // Periodic refetch as a safety net
    const interval = setInterval(loadTranslations, 30000);

    // Refetch when tab regains focus
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadTranslations();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Instant refetch when the content editor broadcasts a successful save
    // Works both within the same tab and across tabs on the same origin
    // 300ms delay ensures the KV write has fully propagated before we read
    const onSync = () => setTimeout(loadTranslations, 300);
    const channel = new BroadcastChannel("translations-sync");
    channel.addEventListener("message", onSync);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      channel.close();
    };
  }, []);

  return (
    <TranslationsContext.Provider value={translations}>
      {children}
    </TranslationsContext.Provider>
  );
}

export function useTranslations<S extends LocalizedSection>(
  section: S,
  lang: LangKey
): TranslationsData[S][LangKey] {
  const translations = useContext(TranslationsContext);
  return (translations[section] as any)?.[lang] ?? ({} as TranslationsData[S][LangKey]);
}
