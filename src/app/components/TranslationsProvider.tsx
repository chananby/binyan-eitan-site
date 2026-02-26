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
    fetch("/api/translations")
      .then((r) => r.json())
      .then((data) => setTranslations(data))
      .catch(() => {});
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
