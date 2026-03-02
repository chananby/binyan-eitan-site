"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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

// ── Portfolio project definitions (matches PortfolioGallery PROJECTS order) ──
const PORTFOLIO_PROJECTS = [
  {
    num: "01",
    projKey: "proj_0",
    coverKey: "proj_0_cover",
    titleKey: "proj_0_title",
    defaultCover: "/amshinov-1.jpg",
    defaultName_he: "קרית אמשינוב",
    defaultName_en: "Amshinov Complex",
  },
  {
    num: "02",
    projKey: "proj_1",
    coverKey: "proj_1_cover",
    titleKey: "proj_1_title",
    defaultCover: "/bayit-vegan.jpg",
    defaultName_he: "אחוזת בית וגן",
    defaultName_en: "Bayit Vegan Estate",
  },
  {
    num: "03",
    projKey: "proj_2",
    coverKey: "proj_2_cover",
    titleKey: "proj_2_title",
    defaultCover: "/ohel-avshalom.jpg",
    defaultName_he: "מוסדות אוהל אבשלום",
    defaultName_en: "Ohel Avshalom Institutions",
  },
  {
    num: "04",
    projKey: "proj_3",
    coverKey: "proj_3_cover",
    titleKey: "proj_3_title",
    defaultCover: "/ramat-eshkol.jpg",
    defaultName_he: "פנטהאוז רמת אשכול",
    defaultName_en: "Ramat Eshkol Penthouse",
  },
];

// Engineering Excellence images (hardcoded in EngineeringExcellence.tsx)
const ENGINEERING_ITEMS = [
  "/precision-tiling-with-laser-alignment.jpg",
  "/structural-foundation-reinforcement.jpg",
  "/luxury-electrical-infrastructure-precision.jpg",
  "/expert-jerusalem-stone-facade-work.jpg",
  "/professional-airless-painting-standards.jpg",
];

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
type EditorMode = "content" | "media";

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
    if (!value || value === "") return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";
    return value as string;
  } catch {
    return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";
  }
}

// ── Thumbnail component with broken-image fallback ────────────────────────────
function ImageThumb({ src, className = "" }: { src: string; className?: string }) {
  const [err, setErr] = useState(false);
  const [key, setKey] = useState(0);

  // Reset error state when src changes
  useEffect(() => { setErr(false); setKey((k) => k + 1); }, [src]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-400 text-xs ${className}`}>
        No URL
      </div>
    );
  }

  return err ? (
    <div className={`flex flex-col items-center justify-center gap-1 bg-gray-100 text-gray-400 ${className}`}>
      <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
        <path d="m3 16 5-5 4 4 3-3 6 6" strokeWidth={1.5} />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </svg>
      <span className="text-[10px] font-mono px-1 truncate max-w-full">{src.split("/").pop()}</span>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={key}
      src={src}
      alt=""
      onError={() => setErr(true)}
      className={`object-cover ${className}`}
    />
  );
}

// ── Helper: read a project's series images from translations ─────────────────
function getProjectImages(translations: TranslationsData, projKey: string): string[] {
  const data = (translations.portfolio as any)?.he || (translations.portfolio as any)?.en || {};
  const images: string[] = [];
  let i = 0;
  while (data[`${projKey}_img_${i}`] !== undefined) {
    images.push(data[`${projKey}_img_${i}`] || "");
    i++;
  }
  return images;
}

// ── Inline icon buttons ───────────────────────────────────────────────────────
function IconBtn({
  onClick, disabled = false, title, children, danger = false,
}: {
  onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`shrink-0 grid place-items-center w-7 h-7 rounded-md border transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${
        danger
          ? "border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
          : "border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

// ── Media Manager Panel ────────────────────────────────────────────────────────
function MediaManager({
  translations,
  onMediaChange,
  onProjectImagesChange,
}: {
  translations: TranslationsData;
  onMediaChange: (section: SectionKey, lang: "en" | "he", key: string, value: string) => void;
  onProjectImagesChange: (projKey: string, images: string[]) => void;
}) {
  const getPortfolioVal = (key: string) =>
    (translations.portfolio as any)?.he?.[key] ||
    (translations.portfolio as any)?.en?.[key] ||
    "";

  const getHeroVal = (key: string) =>
    (translations.hero as any)?.he?.[key] ||
    (translations.hero as any)?.en?.[key] ||
    "";

  const handlePortfolioCover = (key: string, value: string) => {
    onMediaChange("portfolio", "en", key, value);
    onMediaChange("portfolio", "he", key, value);
  };

  const handleHeroImage = (value: string) => {
    onMediaChange("hero", "en", "imageUrl", value);
    onMediaChange("hero", "he", "imageUrl", value);
  };

  // ── Series helpers ──────────────────────────────────────────────────────────
  const updateImage = (projKey: string, idx: number, value: string) => {
    const imgs = [...getProjectImages(translations, projKey)];
    imgs[idx] = value;
    onProjectImagesChange(projKey, imgs);
  };

  const deleteImage = (projKey: string, idx: number) => {
    const imgs = getProjectImages(translations, projKey).filter((_, i) => i !== idx);
    onProjectImagesChange(projKey, imgs);
  };

  const moveImage = (projKey: string, idx: number, dir: -1 | 1) => {
    const imgs = [...getProjectImages(translations, projKey)];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= imgs.length) return;
    [imgs[idx], imgs[swapIdx]] = [imgs[swapIdx], imgs[idx]];
    onProjectImagesChange(projKey, imgs);
  };

  const addImage = (projKey: string) => {
    const imgs = [...getProjectImages(translations, projKey), ""];
    onProjectImagesChange(projKey, imgs);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">

      {/* ── Hero Image ── */}
      <section>
        <SectionDivider label="Hero Image" />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex gap-5 items-start">
            <div className="shrink-0 w-32 h-24 rounded-lg overflow-hidden border border-gray-200">
              <ImageThumb src={getHeroVal("imageUrl") || "/luxury-interior.jpg"} className="w-full h-full" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-2">
                Image URL <span className="font-normal text-gray-400">(hero.imageUrl)</span>
              </label>
              <input
                type="text"
                value={getHeroVal("imageUrl") || "/luxury-interior.jpg"}
                onChange={(e) => handleHeroImage(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-800 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                placeholder="/your-hero-image.jpg"
                dir="ltr"
              />
              <p className="mt-1.5 text-xs text-gray-400">Full-bleed background image in the Hero section.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Portfolio Gallery ── */}
      <section>
        <SectionDivider label="Portfolio Gallery" />
        <div className="space-y-6">
          {PORTFOLIO_PROJECTS.map((proj) => {
            const coverUrl = getPortfolioVal(proj.coverKey) || proj.defaultCover;
            const nameHe = getPortfolioVal(proj.titleKey) || proj.defaultName_he;
            const nameEn = proj.defaultName_en;
            const seriesImages = getProjectImages(translations, proj.projKey);

            return (
              <div key={proj.num} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Project header */}
                <div className="flex items-center gap-2.5 px-5 py-3.5 bg-gray-50 border-b border-gray-200">
                  <span className="font-mono text-xs font-bold text-[#8D775F] bg-[#8D775F]/10 px-2 py-0.5 rounded">
                    {proj.num}
                  </span>
                  <span className="font-bold text-sm text-gray-900" dir="rtl">{nameHe}</span>
                  <span className="text-gray-400 text-xs">·</span>
                  <span className="text-gray-500 text-xs">{nameEn}</span>
                  <span className="ms-auto text-[11px] text-gray-400">
                    {seriesImages.length} gallery photo{seriesImages.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  {/* Cover photo row */}
                  <div>
                    <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2">Cover Photo</p>
                    <div className="flex gap-3 items-start">
                      <div className="shrink-0 w-20 h-14 rounded-md overflow-hidden border border-gray-200 bg-gray-100">
                        <ImageThumb src={coverUrl} className="w-full h-full" />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={coverUrl}
                          onChange={(e) => handlePortfolioCover(proj.coverKey, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                          dir="ltr"
                          placeholder="/project-cover.jpg"
                        />
                        <p className="mt-1 text-[11px] text-gray-400">
                          key: <code className="bg-gray-100 px-1 rounded">{proj.coverKey}</code>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Gallery series */}
                  <div>
                    <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2">
                      Gallery Series
                    </p>

                    {seriesImages.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">No gallery images yet. Add one below.</p>
                    ) : (
                      <div className="space-y-2">
                        {seriesImages.map((url, idx) => (
                          <div key={idx} className="flex gap-2 items-center group">
                            {/* Thumbnail */}
                            <div className="shrink-0 w-12 h-9 rounded overflow-hidden border border-gray-200 bg-gray-100">
                              <ImageThumb src={url} className="w-full h-full" />
                            </div>

                            {/* Index badge */}
                            <span className="shrink-0 font-mono text-[10px] text-gray-400 w-5 text-center">
                              {idx + 1}
                            </span>

                            {/* URL input */}
                            <input
                              type="text"
                              value={url}
                              onChange={(e) => updateImage(proj.projKey, idx, e.target.value)}
                              className="flex-1 min-w-0 border border-gray-300 rounded-md px-2.5 py-1.5 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                              dir="ltr"
                              placeholder="/photo.jpg"
                            />

                            {/* Reorder + delete */}
                            <IconBtn onClick={() => moveImage(proj.projKey, idx, -1)} disabled={idx === 0} title="Move up">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                <path d="M5 8V2M2 5l3-3 3 3" />
                              </svg>
                            </IconBtn>
                            <IconBtn onClick={() => moveImage(proj.projKey, idx, 1)} disabled={idx === seriesImages.length - 1} title="Move down">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                <path d="M5 2v6M2 5l3 3 3-3" />
                              </svg>
                            </IconBtn>
                            <IconBtn onClick={() => deleteImage(proj.projKey, idx)} title="Remove image" danger>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                                <path d="M2 3h6M4 3V2h2v1M3.5 3l.5 5h2l.5-5" />
                              </svg>
                            </IconBtn>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add image button */}
                    <button
                      type="button"
                      onClick={() => addImage(proj.projKey)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#8D775F] hover:text-[#7A6451] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <circle cx="7" cy="7" r="5.5" />
                        <path d="M7 4.5v5M4.5 7h5" />
                      </svg>
                      הוסף תמונה
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Engineering Excellence (read-only reference) ── */}
      <section>
        <SectionDivider label="Engineering Excellence — Reference" />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-4">
            These images are hardcoded in <code className="bg-gray-100 px-1 rounded text-[11px]">EngineeringExcellence.tsx</code>. Edit that file to swap them.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {ENGINEERING_ITEMS.map((src, i) => (
              <div key={i} className="space-y-1.5">
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <ImageThumb src={src} className="w-full h-full" />
                </div>
                <p className="text-[10px] text-gray-400 font-mono leading-tight break-all">{src.split("/").pop()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="h-px flex-1 bg-gray-200" />
      <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">{label}</h3>
      <span className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContentEditorPage() {
  const [editorMode, setEditorMode] = useState<EditorMode>("content");
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
          setArticles(Array.isArray(data.articles) ? data.articles : (defaultTranslations.articles as Article[]));
          setFaqs(Array.isArray(data.faqs) ? data.faqs : (defaultTranslations.faqs as Faq[]));
        }
      } catch {
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

  // Write to any section/lang (used by Media Manager)
  const handleMediaChange = useCallback(
    (section: SectionKey, lang: "en" | "he", key: string, value: string) => {
      setTranslations((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [lang]: {
            ...(prev[section] as any)?.[lang],
            [key]: value,
          },
        },
      }));
      setDirty(true);
    },
    []
  );

  // Batch-update a project's gallery series (add/delete/reorder)
  const handleProjectImagesChange = useCallback(
    (projKey: string, images: string[]) => {
      setTranslations((prev) => {
        const portfolio = prev.portfolio as any;
        const newEn = { ...(portfolio.en || {}) };
        const newHe = { ...(portfolio.he || {}) };
        // Remove all old series keys for this project
        for (const k of Object.keys(newEn)) {
          if (k.startsWith(`${projKey}_img_`)) delete newEn[k];
        }
        for (const k of Object.keys(newHe)) {
          if (k.startsWith(`${projKey}_img_`)) delete newHe[k];
        }
        // Write the new ordered list
        images.forEach((url, i) => {
          newEn[`${projKey}_img_${i}`] = url;
          newHe[`${projKey}_img_${i}`] = url;
        });
        return { ...prev, portfolio: { en: newEn, he: newHe } };
      });
      setDirty(true);
    },
    []
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
        try { await fetch("/api/revalidate", { method: "POST" }); } catch { /* ignore */ }
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(`שמירה נכשלה: ${errorData.error ?? "שגיאת שרת"}`, false);
      }
    } catch {
      showToast("שגיאת רשת. נסה שוב.", false);
    } finally {
      setSaving(false);
    }
  };

  // ── Article CRUD ──────────────────────────────────────────────────────────
  const addArticle = () => {
    setArticles((prev) => [...prev, { id: Date.now().toString(), slug: "", title_en: "", title_he: "", content_en: "", content_he: "" }]);
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
    setFaqs((prev) => [...prev, { id: Date.now().toString(), question_en: "", question_he: "", answer_en: "", answer_he: "" }]);
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

  // ── Derived values (must be above early returns) ──────────────────────────
  const q = searchQuery.toLowerCase().trim();
  const section = activeTab !== "articles" && activeTab !== "faqs"
    ? (translations[activeTab as SectionKey] as any)
    : null;
  const allKeys: string[] =
    section && section.en && section.he
      ? Array.from(new Set([...Object.keys(section.en ?? {}), ...Object.keys(section.he ?? {})]))
      : [];

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8D775F] mb-4" />
        <p className="text-gray-600 font-medium text-lg">טוען נתונים מהשרת...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-3 shrink-0 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Content Editor</h1>
            <p className="text-sm text-gray-500 mt-0.5">עריכת תוכן האתר — בנין איתן</p>
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="px-6 py-2.5 bg-[#8D775F] text-white text-sm font-bold tracking-wide rounded-md disabled:opacity-50 hover:bg-[#7A6451] transition-colors shadow-sm"
          >
            {saving ? "Saving…" : dirty ? "💾 Save Changes" : "Saved"}
          </button>
        </div>

        {/* ── Top-level mode tabs ── */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setEditorMode("content")}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${
              editorMode === "content"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            עריכת תוכן
          </button>
          <button
            onClick={() => setEditorMode("media")}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 flex items-center gap-2 ${
              editorMode === "media"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="m3 16 5-5 4 4 3-3 6 6" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
            ניהול מדיה
          </button>
        </div>

        {/* Search — shown only in content mode */}
        {editorMode === "content" && (
          <>
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
          </>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded shadow-lg text-sm font-bold ${
          toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── MEDIA MODE ── */}
      {editorMode === "media" && (
        <div className="flex-1 overflow-y-auto p-8">
          <MediaManager
            translations={translations}
            onMediaChange={handleMediaChange}
            onProjectImagesChange={handleProjectImagesChange}
          />
        </div>
      )}

      {/* ── CONTENT MODE ── */}
      {editorMode === "content" && (
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

            <div className="border-t-2 border-gray-200 mt-1">
              <p className="px-5 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-widest">CMS</p>
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

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto">

              {/* ── Articles ── */}
              {activeTab === "articles" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">Professional Articles</h2>
                      <p className="text-sm text-gray-500 mt-1">Long-form articles with their own page at /expertise/[slug]</p>
                    </div>
                    <button onClick={addArticle} className="px-4 py-2 bg-[#8D775F] text-white text-sm font-bold rounded-md hover:bg-[#7A6451] transition-colors shadow-sm">
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
                            <span className="text-xs text-gray-400 hidden sm:inline">→ /expertise/{article.slug || "…"}</span>
                          </div>
                          <button onClick={() => deleteArticle(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-3 py-1 rounded hover:bg-red-50 transition-colors shrink-0 ms-4">Delete</button>
                        </div>
                        <div className="p-5 space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div dir="rtl">
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">כותרת (Hebrew Title)</label>
                              <input type="text" value={article.title_he} onChange={(e) => updateArticle(idx, "title_he", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white" dir="rtl" placeholder="כותרת המאמר" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">Title (English)</label>
                              <input type="text" value={article.title_en} onChange={(e) => updateArticle(idx, "title_en", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white" placeholder="Article title" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div dir="rtl">
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">תוכן (Hebrew Content)</label>
                              <textarea value={article.content_he} onChange={(e) => updateArticle(idx, "content_he", e.target.value)} rows={7} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white" dir="rtl" placeholder={"תוכן המאמר...\n\n(הפרד פסקאות בשתי שורות ריקות)"} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">Content (English)</label>
                              <textarea value={article.content_en} onChange={(e) => updateArticle(idx, "content_en", e.target.value)} rows={7} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white" placeholder={"Article content...\n\n(Separate paragraphs with two blank lines)"} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── FAQs ── */}
              {activeTab === "faqs" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">Common Questions (Q&amp;A)</h2>
                      <p className="text-sm text-gray-500 mt-1">Short question/answer pairs — shown as an accordion on the expertise page.</p>
                    </div>
                    <button onClick={addFaq} className="px-4 py-2 bg-[#8D775F] text-white text-sm font-bold rounded-md hover:bg-[#7A6451] transition-colors shadow-sm">
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
                          <button onClick={() => deleteFaq(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-3 py-1 rounded hover:bg-red-50 transition-colors">Delete</button>
                        </div>
                        <div className="p-5 space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div dir="rtl">
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">שאלה (Hebrew Question)</label>
                              <input type="text" value={faq.question_he} onChange={(e) => updateFaq(idx, "question_he", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white" dir="rtl" placeholder="שאלה נפוצה" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">Question (English)</label>
                              <input type="text" value={faq.question_en} onChange={(e) => updateFaq(idx, "question_en", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white" placeholder="Frequently asked question" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div dir="rtl">
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">תשובה (Hebrew Answer)</label>
                              <textarea value={faq.answer_he} onChange={(e) => updateFaq(idx, "answer_he", e.target.value)} rows={4} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white" dir="rtl" placeholder="תשובה לשאלה" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">Answer (English)</label>
                              <textarea value={faq.answer_en} onChange={(e) => updateFaq(idx, "answer_en", e.target.value)} rows={4} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white" placeholder="Answer to the question" />
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
                          <th className="text-right px-5 py-4 font-bold text-gray-700 w-1/3" dir="rtl">עברית (Hebrew)</th>
                          <th className="text-left px-5 py-4 font-bold text-gray-700 w-1/3">English</th>
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
                            const heVal = getSafeValue(translations, defaultTranslations, activeTab as SectionKey, "he", key);
                            const enVal = getSafeValue(translations, defaultTranslations, activeTab as SectionKey, "en", key);
                            const isLong = heVal.length > 50 || enVal.length > 50;
                            // Detect image URL keys for a mini thumbnail
                            const isImageKey = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(heVal) || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(enVal) || key.toLowerCase().includes("image") || key.toLowerCase().includes("cover") || key.toLowerCase().includes("photo") || key.toLowerCase().includes("src") || key.toLowerCase().includes("url");

                            return (
                              <tr key={key} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-4 font-mono text-xs text-gray-500 align-top">
                                  {key}
                                  {isImageKey && (heVal || enVal) && (
                                    <div className="mt-1.5 w-12 h-9 rounded overflow-hidden border border-gray-200">
                                      <ImageThumb src={heVal || enVal} className="w-full h-full" />
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-4 align-top" dir="rtl">
                                  {isLong ? (
                                    <textarea value={heVal} onChange={(e) => handleChange("he", key, e.target.value)} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y transition-shadow bg-white" dir="rtl" />
                                  ) : (
                                    <input type="text" value={heVal} onChange={(e) => handleChange("he", key, e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none transition-shadow bg-white" dir="rtl" />
                                  )}
                                </td>
                                <td className="px-5 py-4 align-top">
                                  {isLong ? (
                                    <textarea value={enVal} onChange={(e) => handleChange("en", key, e.target.value)} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y transition-shadow bg-white" />
                                  ) : (
                                    <input type="text" value={enVal} onChange={(e) => handleChange("en", key, e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none transition-shadow bg-white" />
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
      )}
    </div>
  );
}
