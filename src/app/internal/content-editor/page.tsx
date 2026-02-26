"use client";

import { useEffect, useState, useCallback } from "react";
import defaultTranslations from "@/src/lib/translations.json";

type TranslationsData = typeof defaultTranslations;
type SectionKey = keyof TranslationsData;

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "nav", label: "Navigation" },
  { key: "home", label: "Home" },
  { key: "hero", label: "Hero" },
  { key: "footer", label: "Footer" },
  { key: "contact", label: "Contact" },
  { key: "about", label: "About" },
  { key: "portfolio", label: "Portfolio" },
  { key: "pillars", label: "Pillars" },
  { key: "engineering", label: "Engineering" },
  { key: "projects", label: "Projects" },
];

type SectionData = {
  en: Record<string, string>;
  he: Record<string, string>;
};

// Helper function to safely get value with fallback to defaults
function getSafeValue(
  translations: TranslationsData,
  defaultTrans: TranslationsData,
  section: SectionKey,
  lang: "en" | "he",
  key: string
): string {
  try {
    const sectionData = translations?.[section];
    if (!sectionData) {
      console.log(`[getSafeValue] Section "${section}" missing in translations, using default`);
      return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";
    }
    
    const langData = sectionData?.[lang];
    if (!langData) {
      console.log(`[getSafeValue] Language "${lang}" missing in section "${section}", using default`);
      return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";
    }
    
    const value = langData?.[key];
    
    // If value is empty, use default
    if (!value || value === "") {
      const defaultValue = (defaultTrans[section]?.[lang]?.[key] as string) ?? "";
      if (defaultValue) {
        console.log(`[getSafeValue] Value empty for ${section}.${lang}.${key}, using default`);
      }
      return defaultValue;
    }
    
    return value as string;
  } catch (err) {
    console.error(`[getSafeValue] Error getting ${section}.${lang}.${key}:`, err);
    return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";
  }
}

export default function ContentEditorPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("hero");
  const [translations, setTranslations] = useState<TranslationsData>(defaultTranslations);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Load translations on mount - ensure we get data from API
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        console.log("[ContentEditor] Starting fetch from /api/translations...");
        const res = await fetch("/api/translations", { cache: "no-store" });
        console.log("[ContentEditor] Fetch response status:", res.status);
        
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        
        const data = await res.json();
        console.log("[ContentEditor] Fetched Data:", data);
        console.log("[ContentEditor] Data type:", typeof data);
        console.log("[ContentEditor] Data keys:", data ? Object.keys(data) : "null/undefined");
        
        // Validate structure
        if (data && typeof data === "object") {
          const sectionKeys = Object.keys(data);
          console.log("[ContentEditor] Sections in data:", sectionKeys);
          
          // Check if all expected sections are present
          const hasSections = sectionKeys.length > 0;
          if (hasSections) {
            console.log("[ContentEditor] ✓ Data has sections, setting translations");
            setTranslations(data);
          } else {
            console.warn("[ContentEditor] Data is empty, using defaults");
            setTranslations(defaultTranslations);
          }
        } else {
          console.warn("[ContentEditor] Data is invalid, using defaults");
          setTranslations(defaultTranslations);
        }
      } catch (err) {
        console.error("[ContentEditor] Error loading translations:", err);
        setTranslations(defaultTranslations);
      } finally {
        console.log("[ContentEditor] Setting loading to false");
        setLoading(false);
      }
    };
    loadTranslations();
  }, []);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleChange = useCallback(
    (lang: "en" | "he", key: string, value: string) => {
      setTranslations((prev) => ({
        ...prev,
        [activeSection]: {
          ...prev[activeSection],
          [lang]: {
            ...(prev[activeSection] as SectionData)[lang],
            [key]: value,
          },
        },
      }));
      setDirty(true);
    },
    [activeSection]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/translations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(translations),
      });
      if (res.ok) {
        setDirty(false);
        showToast("Saved successfully!", true);
        
        // Trigger revalidation of all pages that use translations
        try {
          await fetch("/api/revalidate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          console.log("Revalidation queued");
        }
      } else {
        showToast("Save failed. Try again.", false);
      }
    } catch {
      showToast("Network error. Try again.", false);
    } finally {
      setSaving(false);
    }
  }, [translations, showToast]);

  const section = translations[activeSection] as SectionData;
  
  // Validate and log section structure
  const allKeys = section && section.en && section.he ? Array.from(
    new Set([...Object.keys(section.en ?? {}), ...Object.keys(section.he ?? {})])
  ) : [];

  // Debug logging for section and keys
  console.log(`[ContentEditor] Active section: "${activeSection}"`);
  console.log("[ContentEditor] Section data exists:", !!section);
  console.log("[ContentEditor] Section.en keys:", section?.en ? Object.keys(section.en).length : 0);
  console.log("[ContentEditor] Section.he keys:", section?.he ? Object.keys(section.he).length : 0);
  console.log("[ContentEditor] All keys:", allKeys);
  console.log("[ContentEditor] Loading state:", loading);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Content Editor</h1>
          <p className="text-sm text-gray-500 mt-0.5">Edit all public-facing text in Hebrew and English</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving || loading}
          className="px-5 py-2 bg-[#8D775F] text-white text-sm font-semibold tracking-wide rounded disabled:opacity-40 hover:bg-[#7A6451] transition-colors"
        >
          {saving ? "Saving…" : loading ? "Loading..." : "Save Changes"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg text-sm font-medium ${
            toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-100 transition-colors ${
                activeSection === s.key
                  ? "bg-[#8D775F]/10 text-[#8D775F] border-l-2 border-l-[#8D775F]"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Table */}
        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8D775F] mb-4"></div>
                <p className="text-gray-600">Loading content...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl">
              <h2 className="text-base font-bold text-gray-800 mb-4 capitalize">{activeSection}</h2>
              
              {/* Debug Info */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                <p><strong>Debug:</strong> Found {allKeys.length} keys in {activeSection}</p>
                {allKeys.length === 0 && (
                  <p className="mt-1 text-red-600">
                    ⚠️ No keys found. Section: {section ? "exists" : "missing"} | EN: {section?.en ? Object.keys(section.en).length : 0} keys | HE: {section?.he ? Object.keys(section.he).length : 0} keys
                  </p>
                )}
                {allKeys.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1">Sample Values (with Fallback):</p>
                    {allKeys.slice(0, 2).map((k) => {
                      const en = getSafeValue(translations, defaultTranslations, activeSection, "en", k);
                      const he = getSafeValue(translations, defaultTranslations, activeSection, "he", k);
                      const enDisplay = en ? `"${en.substring(0, 30)}..."` : "EMPTY";
                      const heDisplay = he ? `"${he.substring(0, 30)}..."` : "EMPTY";
                      return (
                        <p key={k} className={en && he ? "text-green-600" : "text-red-600"}>
                          {k}: EN={enDisplay} | HE={heDisplay}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 w-44">Key</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600" dir="rtl">
                        Hebrew
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">English</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allKeys.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                          No content found for this section
                        </td>
                      </tr>
                    ) : (
                      allKeys.map((key) => {
                        // Use safe value getter with fallback to defaults
                        const heVal = getSafeValue(translations, defaultTranslations, activeSection, "he", key);
                        const enVal = getSafeValue(translations, defaultTranslations, activeSection, "en", key);
                        
                        const isLong = heVal.length > 60 || enVal.length > 60;
                        return (
                          <tr key={key} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-3 font-mono text-xs text-gray-400 align-top whitespace-nowrap">
                              {key}
                            </td>
                            <td className="px-4 py-3 align-top" dir="rtl">
                              {isLong ? (
                                <textarea
                                  value={heVal}
                                  onChange={(e) => handleChange("he", key, e.target.value)}
                                  rows={3}
                                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-[#8D775F] resize-y"
                                  dir="rtl"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={heVal}
                                  onChange={(e) => handleChange("he", key, e.target.value)}
                                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-[#8D775F]"
                                  dir="rtl"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 align-top">
                              {isLong ? (
                                <textarea
                                  value={enVal}
                                  onChange={(e) => handleChange("en", key, e.target.value)}
                                  rows={3}
                                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#8D775F] resize-y"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={enVal}
                                  onChange={(e) => handleChange("en", key, e.target.value)}
                                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#8D775F]"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
