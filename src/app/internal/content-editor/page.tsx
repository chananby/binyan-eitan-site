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

export default function ContentEditorPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("hero");
  const [translations, setTranslations] = useState<TranslationsData>(defaultTranslations);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/translations")
      .then((r) => r.json())
      .then((data) => setTranslations(data))
      .catch(() => {});
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
  const allKeys = Array.from(
    new Set([...Object.keys(section.en ?? {}), ...Object.keys(section.he ?? {})])
  );

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
          disabled={!dirty || saving}
          className="px-5 py-2 bg-[#8D775F] text-white text-sm font-semibold tracking-wide rounded disabled:opacity-40 hover:bg-[#7A6451] transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
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
          <div className="max-w-5xl">
            <h2 className="text-base font-bold text-gray-800 mb-4 capitalize">{activeSection}</h2>
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
                  {allKeys.map((key) => {
                    const heVal = section.he?.[key] ?? "";
                    const enVal = section.en?.[key] ?? "";
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
