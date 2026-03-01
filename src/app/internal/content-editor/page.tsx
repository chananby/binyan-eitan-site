"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import defaultTranslations from "@/src/lib/translations.json";

type TranslationsData = typeof defaultTranslations;
type SectionKey = keyof TranslationsData;

interface Article {
  id: string;
  slug: string;
  title_en: string;
  title_he: string;
  content_en: string;
  content_he: string;
}

interface Faq {
  id: string;
  question_en: string;
  question_he: string;
  answer_en: string;
  answer_he: string;
}

// Sections that follow the standard { en: {...}, he: {...} } shape
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

type ActiveTab = SectionKey | "articles" | "faqs";

function getSafeValue(
  translations: any,
  defaultTrans: any,
  section: SectionKey,
  lang: "en" | "he",
  key: string
): string {
  try {
    const sectionData = translations?.[section];
    if (!sectionData) return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";

    const langData = sectionData?.[lang];
    if (!langData) return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";

    const value = langData?.[key];
    if (!value || value === "") {
      return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";
    }
    return value as string;
  } catch {
    return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";
  }
}

export default function ContentEditorPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("hero");
  const [translations, setTranslations] = useState<TranslationsData>(defaultTranslations);
  const [articles, setArticles] = useState<Article[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const res = await fetch("/api/translations", { cache: "no-store" });
        if (!res.ok) throw new Error("Fetch failed");

        const data = await res.json();
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setTranslations(data);
          if (Array.isArray(data.articles)) {
            setArticles(data.articles);
          } else {
            setArticles(defaultTranslations.articles as Article[]);
          }
          if (Array.isArray(data.faqs)) {
            setFaqs(data.faqs);
          } else {
            setFaqs(defaultTranslations.faqs as Faq[]);
          }
        }
      } catch {
        console.error("Failed to load translations, using defaults.");
        setTranslations(defaultTranslations);
        setArticles(defaultTranslations.articles as Article[]);
        setFaqs(defaultTranslations.faqs as Faq[]);
      } finally {
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
      if (activeTab === "articles" || activeTab === "faqs") return;
      setTranslations((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab as SectionKey],
          [lang]: {
            ...(prev[activeTab as SectionKey] as any)[lang],
            [key]: value,
          },
        },
      }));
      setDirty(true);
    },
    [activeTab]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...translations, articles, faqs };
      const res = await fetch("/api/translations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDirty(false);
        showToast("נשמר בהצלחה! האתר מתעדכן...", true);

        const channel = new BroadcastChannel("translations-sync");
        channel.postMessage("updated");
        channel.close();

        try {
          await fetch("/api/revalidate", { method: "POST" });
        } catch {
          // ignore
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        const detail = errorData.error ?? "שגיאת שרת";
        showToast(`שמירה נכשלה: ${detail}`, false);
      }
    } catch {
      showToast("שגיאת רשת. נסה שוב.", false);
    } finally {
      setSaving(false);
    }
  };

  // ── Article CRUD ──────────────────────────────────────────────────────────
  const addArticle = () => {
    setArticles((prev) => [
      ...prev,
      { id: Date.now().toString(), slug: "", title_en: "", title_he: "", content_en: "", content_he: "" },
    ]);
    setDirty(true);
  };

  const updateArticle = (idx: number, field: keyof Article, value: string) => {
    setArticles((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
    setDirty(true);
  };

  const deleteArticle = (idx: number) => {
    setArticles((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  // ── FAQ CRUD ──────────────────────────────────────────────────────────────
  const addFaq = () => {
    setFaqs((prev) => [
      ...prev,
      { id: Date.now().toString(), question_en: "", question_he: "", answer_en: "", answer_he: "" },
    ]);
    setDirty(true);
  };

  const updateFaq = (idx: number, field: keyof Faq, value: string) => {
    setFaqs((prev) => prev.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
    setDirty(true);
  };

  const deleteFaq = (idx: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── All derived values that use hooks MUST be above any early return ──────
  const q = searchQuery.toLowerCase().trim();

  const section = activeTab !== "articles" && activeTab !== "faqs"
    ? (translations[activeTab as SectionKey] as any)
    : null;
  const allKeys: string[] =
    section && section.en && section.he
      ? Array.from(new Set([...Object.keys(section.en ?? {}), ...Object.keys(section.he ?? {})]))
      : [];

  // Sections whose keys or values match the search query
  const matchingSections = useMemo(() => {
    if (!q) return null;
    return SECTIONS.filter((s) => {
      if (s.label.toLowerCase().includes(q) || s.key.toLowerCase().includes(q)) return true;
      const sec = (translations[s.key] as any);
      if (!sec) return false;
      for (const lang of ["en", "he"] as const) {
        const langData = sec[lang];
        if (!langData) continue;
        for (const [k, v] of Object.entries(langData)) {
          if (k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)) return true;
        }
      }
      return false;
    });
  }, [q, translations]);

  // Keys for the active section, filtered by search
  const filteredKeys = useMemo(() => {
    if (!q) return allKeys;
    return allKeys.filter((key) => {
      if (key.toLowerCase().includes(q)) return true;
      const heVal = getSafeValue(translations, defaultTranslations, activeTab as SectionKey, "he", key);
      const enVal = getSafeValue(translations, defaultTranslations, activeTab as SectionKey, "en", key);
      return heVal.toLowerCase().includes(q) || enVal.toLowerCase().includes(q);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, activeTab, translations]);
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8D775F] mb-4"></div>
        <p className="text-gray-600 font-medium text-lg">טוען נתונים מהשרת...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-3 shrink-0 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Content Editor</h1>
            <p className="text-sm text-gray-500 mt-0.5">עריכת תוכן האתר - בנין איתן</p>
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="px-6 py-2.5 bg-[#8D775F] text-white text-sm font-bold tracking-wide rounded-md disabled:opacity-50 hover:bg-[#7A6451] transition-colors shadow-sm"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
        {/* Global Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sections, keys, or values… (e.g. הנדסה, contact)"
            className="w-full border border-gray-300 rounded-md pl-9 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
        {q && matchingSections !== null && (
          <p className="text-xs text-gray-500">
            {matchingSections.length === 0
              ? "No matches found."
              : `Matches in: ${matchingSections.map((s) => s.label).join(", ")}`}
          </p>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded shadow-lg text-sm font-bold ${
            toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-56 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          {SECTIONS.map((s) => {
            const hasMatch = q && matchingSections ? matchingSections.some((ms) => ms.key === s.key) : false;
            return (
              <button
                key={s.key}
                onClick={() => setActiveTab(s.key)}
                className={`w-full text-left px-5 py-3.5 text-sm font-medium border-b border-gray-100 transition-colors ${
                  activeTab === s.key
                    ? "bg-[#8D775F]/10 text-[#8D775F] border-l-4 border-l-[#8D775F]"
                    : hasMatch
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s.label}
                {hasMatch && <span className="float-right text-amber-500 text-xs">●</span>}
              </button>
            );
          })}

          {/* CMS separator */}
          <div className="border-t-2 border-gray-200 mt-1">
            <p className="px-5 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-widest">
              CMS
            </p>
            <button
              onClick={() => setActiveTab("articles")}
              className={`w-full text-left px-5 py-3.5 text-sm font-bold border-b border-gray-100 transition-colors ${
                activeTab === "articles"
                  ? "bg-[#8D775F]/10 text-[#8D775F] border-l-4 border-l-[#8D775F]"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Professional Articles
            </button>
            <button
              onClick={() => setActiveTab("faqs")}
              className={`w-full text-left px-5 py-3.5 text-sm font-bold border-b border-gray-100 transition-colors ${
                activeTab === "faqs"
                  ? "bg-[#8D775F]/10 text-[#8D775F] border-l-4 border-l-[#8D775F]"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Common Questions (Q&amp;A)
            </button>
          </div>
        </nav>

        {/* Main area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">

            {/* ── Articles CRUD ── */}
            {activeTab === "articles" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Professional Articles</h2>
                    <p className="text-sm text-gray-500 mt-1">Long-form articles with their own page at /expertise/[slug]</p>
                  </div>
                  <button
                    onClick={addArticle}
                    className="px-4 py-2 bg-[#8D775F] text-white text-sm font-bold rounded-md hover:bg-[#7A6451] transition-colors shadow-sm"
                  >
                    + Add Article
                  </button>
                </div>

                {articles.length === 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm py-16 text-center">
                    <p className="text-gray-500 text-sm">No articles yet. Click &quot;Add Article&quot; to get started.</p>
                  </div>
                )}

                <div className="space-y-6">
                  {articles.map((article, idx) => (
                    <div key={article.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-mono text-xs text-gray-400 shrink-0">#{idx + 1}</span>
                          <span className="text-xs font-bold text-gray-500 shrink-0">Slug:</span>
                          <input
                            type="text"
                            value={article.slug}
                            onChange={(e) => updateArticle(idx, "slug", e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm font-mono text-gray-800 w-56 focus:ring-1 focus:ring-[#8D775F] outline-none bg-white"
                            placeholder="article-url-slug"
                          />
                          <span className="text-xs text-gray-400 hidden sm:inline">
                            → /expertise/{article.slug || "…"}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteArticle(idx)}
                          className="text-red-500 hover:text-red-700 text-sm font-bold px-3 py-1 rounded hover:bg-red-50 transition-colors shrink-0 ms-4"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="p-5 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div dir="rtl">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">כותרת (Hebrew Title)</label>
                            <input
                              type="text"
                              value={article.title_he}
                              onChange={(e) => updateArticle(idx, "title_he", e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white transition-shadow"
                              dir="rtl"
                              placeholder="כותרת המאמר"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Title (English)</label>
                            <input
                              type="text"
                              value={article.title_en}
                              onChange={(e) => updateArticle(idx, "title_en", e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white transition-shadow"
                              placeholder="Article title"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div dir="rtl">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">תוכן (Hebrew Content)</label>
                            <textarea
                              value={article.content_he}
                              onChange={(e) => updateArticle(idx, "content_he", e.target.value)}
                              rows={7}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white transition-shadow"
                              dir="rtl"
                              placeholder={"תוכן המאמר...\n\n(הפרד פסקאות בשתי שורות ריקות)"}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Content (English)</label>
                            <textarea
                              value={article.content_en}
                              onChange={(e) => updateArticle(idx, "content_en", e.target.value)}
                              rows={7}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white transition-shadow"
                              placeholder={"Article content...\n\n(Separate paragraphs with two blank lines)"}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── FAQ CRUD ── */}
            {activeTab === "faqs" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Common Questions (Q&amp;A)</h2>
                    <p className="text-sm text-gray-500 mt-1">Short question/answer pairs — shown as an accordion on the expertise page, no separate page needed.</p>
                  </div>
                  <button
                    onClick={addFaq}
                    className="px-4 py-2 bg-[#8D775F] text-white text-sm font-bold rounded-md hover:bg-[#7A6451] transition-colors shadow-sm"
                  >
                    + Add Question
                  </button>
                </div>

                {faqs.length === 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm py-16 text-center">
                    <p className="text-gray-500 text-sm">No questions yet. Click &quot;Add Question&quot; to get started.</p>
                  </div>
                )}

                <div className="space-y-6">
                  {faqs.map((faq, idx) => (
                    <div key={faq.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                        <span className="font-mono text-xs text-gray-400">#{idx + 1}</span>
                        <button
                          onClick={() => deleteFaq(idx)}
                          className="text-red-500 hover:text-red-700 text-sm font-bold px-3 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Question row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div dir="rtl">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">שאלה (Hebrew Question)</label>
                            <input
                              type="text"
                              value={faq.question_he}
                              onChange={(e) => updateFaq(idx, "question_he", e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white transition-shadow"
                              dir="rtl"
                              placeholder="שאלה נפוצה"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Question (English)</label>
                            <input
                              type="text"
                              value={faq.question_en}
                              onChange={(e) => updateFaq(idx, "question_en", e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white transition-shadow"
                              placeholder="Frequently asked question"
                            />
                          </div>
                        </div>

                        {/* Answer row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div dir="rtl">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">תשובה (Hebrew Answer)</label>
                            <textarea
                              value={faq.answer_he}
                              onChange={(e) => updateFaq(idx, "answer_he", e.target.value)}
                              rows={4}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white transition-shadow"
                              dir="rtl"
                              placeholder="תשובה לשאלה"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">Answer (English)</label>
                            <textarea
                              value={faq.answer_en}
                              onChange={(e) => updateFaq(idx, "answer_en", e.target.value)}
                              rows={4}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white transition-shadow"
                              placeholder="Answer to the question"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Standard section table ── */}
            {activeTab !== "articles" && activeTab !== "faqs" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
                  {activeTab} Section
                </h2>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-5 py-4 font-bold text-gray-700 w-48">Key</th>
                        <th className="text-right px-5 py-4 font-bold text-gray-700 w-1/3" dir="rtl">
                          עברית (Hebrew)
                        </th>
                        <th className="text-left px-5 py-4 font-bold text-gray-700 w-1/3">
                          English
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeys.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-10 text-center text-gray-500">
                            {q ? `No matching keys in this section.` : "לא נמצאו שדות לעריכה באזור זה."}
                          </td>
                        </tr>
                      ) : (
                        filteredKeys.map((key) => {
                          const heVal = getSafeValue(
                            translations,
                            defaultTranslations,
                            activeTab as SectionKey,
                            "he",
                            key
                          );
                          const enVal = getSafeValue(
                            translations,
                            defaultTranslations,
                            activeTab as SectionKey,
                            "en",
                            key
                          );
                          const isLong = heVal.length > 50 || enVal.length > 50;

                          return (
                            <tr
                              key={key}
                              className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="px-5 py-4 font-mono text-xs text-gray-500 align-top">
                                {key}
                              </td>
                              <td className="px-5 py-4 align-top" dir="rtl">
                                {isLong ? (
                                  <textarea
                                    value={heVal}
                                    onChange={(e) => handleChange("he", key, e.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y transition-shadow bg-white"
                                    dir="rtl"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={heVal}
                                    onChange={(e) => handleChange("he", key, e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none transition-shadow bg-white"
                                    dir="rtl"
                                  />
                                )}
                              </td>
                              <td className="px-5 py-4 align-top">
                                {isLong ? (
                                  <textarea
                                    value={enVal}
                                    onChange={(e) => handleChange("en", key, e.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y transition-shadow bg-white"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={enVal}
                                    onChange={(e) => handleChange("en", key, e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none transition-shadow bg-white"
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

          </div>
        </main>
      </div>
    </div>
  );
}
