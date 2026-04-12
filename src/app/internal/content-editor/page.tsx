"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import defaultTranslations from "@/src/lib/translations.json";
import XRaySlider from "@/src/app/components/XRaySlider";

type TranslationsData = typeof defaultTranslations;
type SectionKey = keyof TranslationsData;

interface Article {
  id: string;
  slug: string;
  title_en: string;
  title_he: string;
  intro_en?: string;
  intro_he?: string;
  s1_title_en?: string;
  s1_title_he?: string;
  s1_body_en?: string;
  s1_body_he?: string;
  s2_title_en?: string;
  s2_title_he?: string;
  s2_body_en?: string;
  s2_body_he?: string;
  table_data_en?: string;
  table_data_he?: string;
  tip_en?: string;
  tip_he?: string;
  summary_en?: string;
  summary_he?: string;
  mainImage?: string;
  mainImageAlt?: string;
}

interface Faq {
  id: string;
  question_en: string;
  question_he: string;
  answer_en: string;
  answer_he: string;
}

interface Testimonial {
  id: string;
  name: string;
  city_he?: string;
  city_en?: string;
  text_he: string;
  text_en: string;
  rating: number;
  year?: string;
  source?: string;
}

// Image item with alt text
interface ProjectImage {
  url: string;
  alt: string;
}

// ── Portfolio project definitions ──────────────────────────────────────────────
const PORTFOLIO_PROJECTS = [
  { num: "01", projKey: "proj_0", coverKey: "proj_0_cover", titleKey: "proj_0_title", defaultCover: "/amshinov-1.jpg",    defaultName_he: "קרית אמשינוב",       defaultName_en: "Amshinov Complex" },
  { num: "02", projKey: "proj_1", coverKey: "proj_1_cover", titleKey: "proj_1_title", defaultCover: "/bayit-vegan.jpg",   defaultName_he: "אחוזת בית וגן",       defaultName_en: "Bayit Vegan Estate" },
  { num: "03", projKey: "proj_2", coverKey: "proj_2_cover", titleKey: "proj_2_title", defaultCover: "/ohel-avshalom.jpg", defaultName_he: "מוסדות אוהל אבשלום", defaultName_en: "Ohel Avshalom Institutions" },
  { num: "04", projKey: "proj_3", coverKey: "proj_3_cover", titleKey: "proj_3_title", defaultCover: "/ramat-eshkol.jpg",  defaultName_he: "פנטהאוז רמת אשכול",  defaultName_en: "Ramat Eshkol Penthouse" },
];

// Fallback engineering image sources
const ENGINEERING_FALLBACKS = [
  "/precision-tiling-with-laser-alignment.jpg",
  "/structural-foundation-reinforcement.jpg",
  "/luxury-electrical-infrastructure-precision.jpg",
  "/expert-jerusalem-stone-facade-work.jpg",
  "/ramat-eshkol-penthouse-2.jpg",
];

// Content sections for the text editor sidebar
const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "nav",         label: "ניווט (Nav)" },
  { key: "home",        label: "בית (Home)" },
  { key: "hero",        label: "פתיחה (Hero)" },
  { key: "footer",      label: "כותרת תחתונה" },
  { key: "contact",     label: "יצירת קשר" },
  { key: "about",       label: "אודות" },
  { key: "portfolio",   label: "תיק עבודות" },
  { key: "pillars",     label: "עמודי יסוד" },
  { key: "engineering", label: "הנדסה" },
  { key: "projects",    label: "פרויקטים" },
];

type ActiveTab = SectionKey | "faqs" | "testimonials";
type EditorMode = "content" | "media" | "articles";

function getSafeValue(translations: any, defaultTrans: any, section: SectionKey, lang: "en" | "he", key: string): string {
  try {
    const v = translations?.[section]?.[lang]?.[key];
    if (v === undefined || v === null) return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";
    return v as string;
  } catch {
    return (defaultTrans[section]?.[lang]?.[key] as string) ?? "";
  }
}

// ── Thumbnail with broken-image fallback ─────────────────────────────────────
function ImageThumb({ src, className = "" }: { src: string; className?: string }) {
  const [err, setErr] = useState(false);
  const [k, setK] = useState(0);
  useEffect(() => { setErr(false); setK((n) => n + 1); }, [src]);

  if (!src) return (
    <div className={`flex items-center justify-center bg-gray-100 text-gray-300 text-[10px] ${className}`}>
      ללא תמונה
    </div>
  );
  return err ? (
    <div className={`flex flex-col items-center justify-center gap-1 bg-gray-100 text-gray-300 ${className}`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
        <path d="m3 16 5-5 4 4 3-3 6 6" strokeWidth={1.5} />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </svg>
      <span className="text-[9px] font-mono px-1 truncate max-w-full">{src.split("/").pop()}</span>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={k} src={src} alt="" onError={() => setErr(true)} className={`object-cover ${className}`} />
  );
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="h-px flex-1 bg-gray-200" />
      <h3 className="text-[11px] font-bold tracking-[0.18em] uppercase text-gray-400">{label}</h3>
      <span className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function IconBtn({ onClick, disabled = false, title, children, danger = false }: {
  onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`shrink-0 grid place-items-center w-7 h-7 rounded-md border transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${
        danger
          ? "border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600"
          : "border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      }`}>
      {children}
    </button>
  );
}

// SVG icon helpers
const SvgUp = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M5 8V2M2 5l3-3 3 3" />
  </svg>
);
const SvgDown = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M5 2v6M2 5l3 3 3-3" />
  </svg>
);
const SvgTrash = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <path d="M2 3h6M4 3V2h2v1M3.5 3l.5 5h2l.5-5" />
  </svg>
);

// ── Image row (URL + alt text + controls) ─────────────────────────────────────
function ImageRow({
  image, index, total,
  onUrlChange, onAltChange, onMoveUp, onMoveDown, onDelete,
}: {
  image: ProjectImage; index: number; total: number;
  onUrlChange: (v: string) => void; onAltChange: (v: string) => void;
  onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex gap-2 items-start group">
      {/* Thumbnail */}
      <div className="shrink-0 w-14 h-11 rounded overflow-hidden border border-gray-200 bg-gray-100 mt-0.5">
        <ImageThumb src={image.url} className="w-full h-full" />
      </div>

      {/* Inputs */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1">
          <span className="shrink-0 font-mono text-[9px] text-gray-300 w-4 text-center">{index + 1}</span>
          <input
            type="text" value={image.url} onChange={(e) => onUrlChange(e.target.value)}
            className="flex-1 min-w-0 border border-gray-300 rounded-md px-2.5 py-1.5 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
            dir="ltr" placeholder="/photo.jpg"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="shrink-0 w-4" />
          <input
            type="text" value={image.alt} onChange={(e) => onAltChange(e.target.value)}
            className="flex-1 min-w-0 border border-gray-200 rounded-md px-2.5 py-1 text-[11px] text-gray-600 focus:ring-1 focus:ring-[#8D775F] focus:border-transparent outline-none bg-gray-50"
            placeholder="תיאור תמונה (SEO / נגישות)"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 flex flex-col gap-1 mt-0.5">
        <IconBtn onClick={onMoveUp}   disabled={index === 0}         title="הזז למעלה"><SvgUp /></IconBtn>
        <IconBtn onClick={onMoveDown} disabled={index === total - 1} title="הזז למטה"><SvgDown /></IconBtn>
        <IconBtn onClick={onDelete} title="הסר תמונה" danger><SvgTrash /></IconBtn>
      </div>
    </div>
  );
}

// ── Bold-capable textarea ─────────────────────────────────────────────────────
// Wraps/unwraps **bold** markers around selected text.
// Ctrl+B (or Cmd+B) is the keyboard shortcut; there's also a toolbar B button.
// The onChange signature matches a standard textarea so it's a drop-in replacement.
function BoldTextarea({
  value = "",
  onChange,
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function applyBold() {
    const el = ref.current;
    if (!el || !onChange) return;
    const s = el.selectionStart ?? 0;
    const e = el.selectionEnd ?? 0;
    const selected = value.slice(s, e);
    const before = value.slice(0, s);
    const after = value.slice(e);
    const isBold = selected.startsWith("**") && selected.endsWith("**") && selected.length > 4;
    const newVal = isBold
      ? before + selected.slice(2, -2) + after
      : before + "**" + (selected || "טקסט") + "**" + after;
    onChange({ target: { value: newVal } } as React.ChangeEvent<HTMLTextAreaElement>);
    const shift = isBold ? -4 : 4;
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(s + (isBold ? 0 : 2), Math.max(s + (isBold ? 0 : 2), e + shift));
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyBold();
    }
    (rest.onKeyDown as ((e: React.KeyboardEvent<HTMLTextAreaElement>) => void) | undefined)?.(e);
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyBold(); }}
          title="הדגש טקסט נבחר (Ctrl+B)"
          className="text-[11px] leading-none px-1.5 py-0.5 border border-gray-200 rounded bg-white hover:bg-gray-100 text-gray-600 select-none font-bold"
        >
          B
        </button>
        <span className="text-[9px] text-gray-300 select-none">Ctrl+B</span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        {...rest}
        className={className}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

// ── Helper: read a project's series from translations ─────────────────────────
function getProjectImages(translations: TranslationsData, projKey: string): ProjectImage[] {
  const data = (translations.portfolio as any)?.he || {};
  const images: ProjectImage[] = [];
  let i = 0;
  while (data[`${projKey}_img_${i}`] !== undefined) {
    images.push({ url: data[`${projKey}_img_${i}`] || "", alt: data[`${projKey}_img_${i}_alt`] || "" });
    i++;
  }
  return images;
}

// ── Helper: read engineering images from translations ─────────────────────────
function getEngineeringImages(translations: TranslationsData): ProjectImage[] {
  const data = (translations.engineering as any)?.he || (translations.engineering as any)?.en || {};
  return ENGINEERING_FALLBACKS.map((fallback, i) => ({
    url: data[`imageUrl_${i}`] || fallback,
    alt: data[`imageAlt_${i}`] || "",
  }));
}

// ── Media Manager ─────────────────────────────────────────────────────────────
function MediaManager({
  translations, onMediaChange, onProjectImagesChange, onEngineeringImagesChange,
}: {
  translations: TranslationsData;
  onMediaChange: (section: SectionKey, lang: "en" | "he", key: string, value: string) => void;
  onProjectImagesChange: (projKey: string, images: ProjectImage[]) => void;
  onEngineeringImagesChange: (images: ProjectImage[]) => void;
}) {
  const getPortfolioVal = (key: string) =>
    (translations.portfolio as any)?.he?.[key] || (translations.portfolio as any)?.en?.[key] || "";
  const getHeroVal = (key: string) =>
    (translations.hero as any)?.he?.[key] || (translations.hero as any)?.en?.[key] || "";

  const setBoth = (section: SectionKey, key: string, value: string) => {
    onMediaChange(section, "en", key, value);
    onMediaChange(section, "he", key, value);
  };

  // ── Series helpers ───────────────────────────
  const updateProjImage = (projKey: string, idx: number, field: keyof ProjectImage, val: string) => {
    const imgs = [...getProjectImages(translations, projKey)];
    imgs[idx] = { ...imgs[idx], [field]: val };
    onProjectImagesChange(projKey, imgs);
  };
  const deleteProjImage = (projKey: string, idx: number) => {
    onProjectImagesChange(projKey, getProjectImages(translations, projKey).filter((_, i) => i !== idx));
  };
  const moveProjImage = (projKey: string, idx: number, dir: -1 | 1) => {
    const imgs = [...getProjectImages(translations, projKey)];
    const si = idx + dir;
    if (si < 0 || si >= imgs.length) return;
    [imgs[idx], imgs[si]] = [imgs[si], imgs[idx]];
    onProjectImagesChange(projKey, imgs);
  };
  const addProjImage = (projKey: string) => {
    onProjectImagesChange(projKey, [...getProjectImages(translations, projKey), { url: "", alt: "" }]);
  };

  // ── Engineering helpers ──────────────────────
  const updateEngImage = (idx: number, field: keyof ProjectImage, val: string) => {
    const imgs = [...getEngineeringImages(translations)];
    imgs[idx] = { ...imgs[idx], [field]: val };
    onEngineeringImagesChange(imgs);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-10" dir="rtl">

      {/* ── תמונת פתיחה (Hero) ── */}
      <section>
        <SectionDivider label="תמונת פתיחה (Hero)" />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex gap-4 items-start">
            <div className="shrink-0 w-36 h-28 rounded-lg overflow-hidden border border-gray-200">
              <ImageThumb src={getHeroVal("imageUrl") || "/luxury-interior.jpg"} className="w-full h-full" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">כתובת תמונה</label>
                <input type="text" dir="ltr"
                  value={getHeroVal("imageUrl") || "/luxury-interior.jpg"}
                  onChange={(e) => setBoth("hero", "imageUrl", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                  placeholder="/your-hero-image.jpg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">תיאור תמונה (SEO / נגישות)</label>
                <input type="text"
                  value={getHeroVal("imageAlt")}
                  onChange={(e) => setBoth("hero", "imageAlt", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:ring-1 focus:ring-[#8D775F] focus:border-transparent outline-none"
                  placeholder="תיאור קצר לנגישות ו-SEO"
                />
              </div>
              <p className="text-[11px] text-gray-400">תמונת הרקע הראשית של עמוד הבית.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── גלריית פרויקטים ── */}
      <section>
        <SectionDivider label="גלריית פרויקטים" />
        <div className="space-y-6">
          {PORTFOLIO_PROJECTS.map((proj) => {
            const coverUrl = getPortfolioVal(proj.coverKey) || proj.defaultCover;
            const coverAlt = getPortfolioVal(`${proj.coverKey}_alt`);
            const nameHe = getPortfolioVal(proj.titleKey) || proj.defaultName_he;
            const seriesImages = getProjectImages(translations, proj.projKey);

            return (
              <div key={proj.num} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Project header */}
                <div className="flex items-center gap-2.5 px-5 py-3.5 bg-gray-50 border-b border-gray-200">
                  <span className="font-mono text-xs font-bold text-[#8D775F] bg-[#8D775F]/10 px-2 py-0.5 rounded">{proj.num}</span>
                  <span className="font-bold text-sm text-gray-900">{nameHe}</span>
                  <span className="text-gray-400 text-xs">·</span>
                  <span className="text-gray-400 text-xs">{proj.defaultName_en}</span>
                  <span className="ms-auto text-[11px] text-gray-400">
                    {seriesImages.length} תמונה{seriesImages.length !== 1 ? " בגלריה" : " בגלריה"}
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  {/* Cover photo */}
                  <div>
                    <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2.5">תמונת שער</p>
                    <div className="flex gap-3 items-start">
                      <div className="shrink-0 w-24 h-16 rounded-md overflow-hidden border border-gray-200 bg-gray-100">
                        <ImageThumb src={coverUrl} className="w-full h-full" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input type="text" dir="ltr" value={coverUrl}
                          onChange={(e) => { setBoth("portfolio", proj.coverKey, e.target.value); }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                          placeholder="/project-cover.jpg"
                        />
                        <input type="text" value={coverAlt}
                          onChange={(e) => setBoth("portfolio", `${proj.coverKey}_alt`, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] text-gray-600 bg-gray-50 focus:ring-1 focus:ring-[#8D775F] focus:border-transparent outline-none"
                          placeholder="תיאור תמונה (SEO / נגישות)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gallery series */}
                  <div>
                    <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2.5">גלריית הפרויקט</p>
                    {seriesImages.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">אין תמונות עדיין — הוסף תמונה ראשונה:</p>
                    ) : (
                      <div className="space-y-2.5">
                        {seriesImages.map((img, idx) => (
                          <ImageRow
                            key={idx} image={img} index={idx} total={seriesImages.length}
                            onUrlChange={(v) => updateProjImage(proj.projKey, idx, "url", v)}
                            onAltChange={(v) => updateProjImage(proj.projKey, idx, "alt", v)}
                            onMoveUp={() => moveProjImage(proj.projKey, idx, -1)}
                            onMoveDown={() => moveProjImage(proj.projKey, idx, 1)}
                            onDelete={() => deleteProjImage(proj.projKey, idx)}
                          />
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => addProjImage(proj.projKey)}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#8D775F] hover:bg-[#7A6451] text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M6 1v10M1 6h10" />
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

      {/* ── X-Ray Slider ── */}
      <section>
        <SectionDivider label="X-Ray Slider — תשתית vs תוצאה סופית" />
        <div className="space-y-6">
          {PORTFOLIO_PROJECTS.slice(0, 2).map((proj) => {
            const beforeUrl = getPortfolioVal(`xray_before_${proj.projKey}`) ||
              (translations.projects as any)?.he?.[`${proj.projKey}_xray_before`] || "";
            const afterUrl  = getPortfolioVal(`xray_after_${proj.projKey}`) ||
              (translations.projects as any)?.he?.[`${proj.projKey}_xray_after`] || "";
            return (
              <div key={proj.num} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 bg-gray-50 border-b border-gray-200">
                  <span className="font-mono text-xs font-bold text-[#8D775F] bg-[#8D775F]/10 px-2 py-0.5 rounded">{proj.num}</span>
                  <span className="font-bold text-sm text-gray-900">{proj.defaultName_he}</span>
                  <span className="text-gray-400 text-xs">·</span>
                  <span className="text-gray-400 text-xs">{proj.defaultName_en}</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">
                        תמונת תשתית (Before)
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 w-14 h-10 rounded overflow-hidden border border-gray-200 bg-gray-100">
                          <ImageThumb src={beforeUrl} className="w-full h-full" />
                        </div>
                        <input
                          type="text" dir="ltr" value={beforeUrl}
                          onChange={(e) => {
                            setBoth("projects", `${proj.projKey}_xray_before`, e.target.value);
                          }}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                          placeholder="/infrastructure-photo.jpg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">
                        תמונת תוצאה סופית (After)
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 w-14 h-10 rounded overflow-hidden border border-gray-200 bg-gray-100">
                          <ImageThumb src={afterUrl} className="w-full h-full" />
                        </div>
                        <input
                          type="text" dir="ltr" value={afterUrl}
                          onChange={(e) => {
                            setBoth("projects", `${proj.projKey}_xray_after`, e.target.value);
                          }}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                          placeholder="/final-result-photo.jpg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live preview — only shown when both URLs are filled */}
                  {beforeUrl && afterUrl ? (
                    <div>
                      <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2">תצוגה מקדימה חיה</p>
                      <XRaySlider
                        beforeUrl={beforeUrl}
                        afterUrl={afterUrl}
                        beforeLabel="תשתית"
                        afterLabel="תוצאה סופית"
                        dir="rtl"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-2 text-center">
                      הזינו שתי כתובות תמונה כדי לראות תצוגה מקדימה חיה של ה-Slider
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── מצוינות הנדסית ── */}
      <section>
        <SectionDivider label="מצוינות הנדסית — 5 תמונות" />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-4">
            תמונות אלו מוצגות בגלריית המצוינות ההנדסית. ניתן להחליף את הקבצים ולשנות את הסדר.
          </p>
          <div className="space-y-2.5">
            {getEngineeringImages(translations).map((img, idx) => (
              <ImageRow
                key={idx} image={img} index={idx} total={5}
                onUrlChange={(v) => updateEngImage(idx, "url", v)}
                onAltChange={(v) => updateEngImage(idx, "alt", v)}
                onMoveUp={() => {
                  const imgs = [...getEngineeringImages(translations)];
                  if (idx === 0) return;
                  [imgs[idx], imgs[idx - 1]] = [imgs[idx - 1], imgs[idx]];
                  onEngineeringImagesChange(imgs);
                }}
                onMoveDown={() => {
                  const imgs = [...getEngineeringImages(translations)];
                  if (idx === imgs.length - 1) return;
                  [imgs[idx], imgs[idx + 1]] = [imgs[idx + 1], imgs[idx]];
                  onEngineeringImagesChange(imgs);
                }}
                onDelete={() => {/* engineering slots fixed — just clear */
                  const imgs = [...getEngineeringImages(translations)];
                  imgs[idx] = { url: "", alt: "" };
                  onEngineeringImagesChange(imgs);
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Articles Manager ───────────────────────────────────────────────────────────
function ArticlesManager({
  articles, onAdd, onUpdate, onDelete,
}: {
  articles: Article[];
  onAdd: () => void;
  onUpdate: (idx: number, field: keyof Article, value: string) => void;
  onDelete: (idx: number) => void;
}) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  function copyAllArticles() {
    const row = (label: string, val: string | undefined) => val ? `${label}\n  ${val}` : "";
    const lines: string[] = [];
    articles.forEach((article, idx) => {
      lines.push(
        `════════════════════════════════════`,
        `  מאמר #${String(idx + 1).padStart(2, "0")} — ${article.slug || "(ללא slug)"}`,
        `════════════════════════════════════`, "",
        row("כותרת עב:", article.title_he), row("Title EN:", article.title_en), "",
        row("פתיח עב:", article.intro_he), row("Intro EN:", article.intro_en), "",
        row("פרק 1 כותרת עב:", article.s1_title_he), row("S1 title EN:", article.s1_title_en),
        row("פרק 1 גוף עב:", article.s1_body_he), row("S1 body EN:", article.s1_body_en), "",
        row("פרק 2 כותרת עב:", article.s2_title_he), row("S2 title EN:", article.s2_title_en),
        row("פרק 2 גוף עב:", article.s2_body_he), row("S2 body EN:", article.s2_body_en), "",
        row("טיפ עב:", article.tip_he), row("Tip EN:", article.tip_en), "",
        row("סיכום עב:", article.summary_he), row("Summary EN:", article.summary_en), "",
      );
    });
    navigator.clipboard.writeText(lines.filter(Boolean).join("\n"));
    setCopiedId("ALL");
    setTimeout(() => setCopiedId(null), 2000);
  }

  function copyArticle(article: Article, idx: number) {
    const row = (label: string, val: string | undefined) => val ? `${label}\n  ${val}` : "";
    const lines = [
      `════════════════════════════════════`,
      `  מאמר #${String(idx + 1).padStart(2, "0")} — ${article.slug || "(ללא slug)"}`,
      `════════════════════════════════════`,
      "",
      row("כותרת עב:", article.title_he),
      row("Title EN:", article.title_en),
      "",
      row("פתיח עב:", article.intro_he),
      row("Intro EN:", article.intro_en),
      "",
      row("פרק 1 — כותרת עב:", article.s1_title_he),
      row("Section 1 title EN:", article.s1_title_en),
      row("פרק 1 — גוף עב:", article.s1_body_he),
      row("Section 1 body EN:", article.s1_body_en),
      "",
      row("פרק 2 — כותרת עב:", article.s2_title_he),
      row("Section 2 title EN:", article.s2_title_en),
      row("פרק 2 — גוף עב:", article.s2_body_he),
      row("Section 2 body EN:", article.s2_body_en),
      "",
      row("טבלה עב:", article.table_data_he),
      row("Table EN:", article.table_data_en),
      "",
      row("טיפ עב:", article.tip_he),
      row("Tip EN:", article.tip_en),
      "",
      row("סיכום עב:", article.summary_he),
      row("Summary EN:", article.summary_en),
    ].filter((l) => l !== undefined).join("\n");
    navigator.clipboard.writeText(lines);
    setCopiedId(article.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto pb-10" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">ניהול מאמרים מקצועיים</h2>
          <p className="text-sm text-gray-500 mt-1">כל מאמר מקבל עמוד משלו בכתובת <span dir="ltr">/expertise/[slug]</span></p>
        </div>
        <div className="flex items-center gap-2">
          {articles.length > 0 && (
            <button
              onClick={copyAllArticles}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${
                copiedId === "ALL" ? "border-green-300 text-green-600 bg-green-50" : "border-gray-200 text-gray-500 hover:border-[#8D775F] hover:text-[#8D775F]"
              }`}
            >
              {copiedId === "ALL" ? "✓ הועתק" : "📋 העתק הכל"}
            </button>
          )}
          <button onClick={onAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8D775F] hover:bg-[#7A6451] text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M7 1v12M1 7h12" />
            </svg>
            מאמר חדש
          </button>
        </div>
      </div>

      {articles.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
          <p className="text-gray-400 text-sm">אין מאמרים עדיין. לחץ על &quot;מאמר חדש&quot; להתחלה.</p>
        </div>
      )}

      <div className="space-y-6">
        {articles.map((article, idx) => (
          <div key={article.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50 border-b border-gray-200">
              <span className="font-mono text-xs text-[#8D775F] bg-[#8D775F]/10 px-2 py-0.5 rounded font-bold">
                #{String(idx + 1).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <label className="text-xs font-bold text-gray-500 shrink-0">Slug:</label>
                <input type="text" dir="ltr" value={article.slug}
                  onChange={(e) => onUpdate(idx, "slug", e.target.value)}
                  className="min-w-0 border border-gray-300 rounded px-2 py-1 text-xs font-mono text-gray-800 w-52 focus:ring-1 focus:ring-[#8D775F] outline-none bg-white"
                  placeholder="article-url-slug"
                />
                <span className="text-[11px] text-gray-400 hidden sm:inline" dir="ltr">
                  → /expertise/{article.slug || "…"}
                </span>
              </div>
              <button
                onClick={() => copyArticle(article, idx)}
                className={`text-xs font-bold px-3 py-1 rounded transition-colors shrink-0 ${
                  copiedId === article.id
                    ? "text-green-600 bg-green-50"
                    : "text-[#8D775F] hover:bg-[#8D775F]/10"
                }`}
              >
                {copiedId === article.id ? "✓ הועתק" : "📋 העתק"}
              </button>
              <button onClick={() => onDelete(idx)}
                className="text-red-400 hover:text-red-600 text-xs font-bold px-3 py-1 rounded hover:bg-red-50 transition-colors shrink-0">
                מחק
              </button>
            </div>

            <div className="p-5 space-y-6">

              {/* Main image */}
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2.5">תמונת מאמר</p>
                <div className="flex gap-3 items-start">
                  <div className="shrink-0 w-24 h-16 rounded-md overflow-hidden border border-gray-200 bg-gray-100">
                    <ImageThumb src={article.mainImage || ""} className="w-full h-full" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input type="text" dir="ltr" value={article.mainImage || ""}
                      onChange={(e) => onUpdate(idx, "mainImage", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                      placeholder="/article-main-image.jpg"
                    />
                    <input type="text" value={article.mainImageAlt || ""}
                      onChange={(e) => onUpdate(idx, "mainImageAlt", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] text-gray-600 bg-gray-50 focus:ring-1 focus:ring-[#8D775F] focus:border-transparent outline-none"
                      placeholder="תיאור תמונה (SEO / נגישות)"
                    />
                  </div>
                </div>
              </div>

              {/* Titles */}
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2.5">כותרת</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" dir="rtl" value={article.title_he}
                    onChange={(e) => onUpdate(idx, "title_he", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                    placeholder="כותרת המאמר (עברית)"
                  />
                  <input type="text" dir="ltr" value={article.title_en}
                    onChange={(e) => onUpdate(idx, "title_en", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                    placeholder="Article title (English)"
                  />
                </div>
              </div>

              {/* Intro */}
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2.5">פתיח (Intro)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <BoldTextarea dir="rtl" rows={3} value={article.intro_he || ""}
                    onChange={(e) => onUpdate(idx, "intro_he", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white"
                    placeholder="פסקת פתיח יוקרתית..."
                  />
                  <BoldTextarea dir="ltr" rows={3} value={article.intro_en || ""}
                    onChange={(e) => onUpdate(idx, "intro_en", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white"
                    placeholder="Elegant opening paragraph..."
                  />
                </div>
              </div>

              {/* Section 1 */}
              <div className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50/50">
                <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400">פרק 1</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" dir="rtl" value={article.s1_title_he || ""}
                    onChange={(e) => onUpdate(idx, "s1_title_he", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-medium focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                    placeholder="כותרת פרק 1 (עברית)"
                  />
                  <input type="text" dir="ltr" value={article.s1_title_en || ""}
                    onChange={(e) => onUpdate(idx, "s1_title_en", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-medium focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                    placeholder="Section 1 title (English)"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <BoldTextarea dir="rtl" rows={4} value={article.s1_body_he || ""}
                    onChange={(e) => onUpdate(idx, "s1_body_he", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white"
                    placeholder="תוכן פרק 1..."
                  />
                  <BoldTextarea dir="ltr" rows={4} value={article.s1_body_en || ""}
                    onChange={(e) => onUpdate(idx, "s1_body_en", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white"
                    placeholder="Section 1 body..."
                  />
                </div>
              </div>

              {/* Section 2 */}
              <div className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50/50">
                <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400">פרק 2</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" dir="rtl" value={article.s2_title_he || ""}
                    onChange={(e) => onUpdate(idx, "s2_title_he", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-medium focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                    placeholder="כותרת פרק 2 (עברית)"
                  />
                  <input type="text" dir="ltr" value={article.s2_title_en || ""}
                    onChange={(e) => onUpdate(idx, "s2_title_en", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-medium focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                    placeholder="Section 2 title (English)"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <BoldTextarea dir="rtl" rows={4} value={article.s2_body_he || ""}
                    onChange={(e) => onUpdate(idx, "s2_body_he", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white"
                    placeholder="תוכן פרק 2..."
                  />
                  <BoldTextarea dir="ltr" rows={4} value={article.s2_body_en || ""}
                    onChange={(e) => onUpdate(idx, "s2_body_en", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white"
                    placeholder="Section 2 body..."
                  />
                </div>
              </div>

              {/* Table Data */}
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-1">טבלת השוואה (Table Data)</p>
                <p className="text-[10px] text-gray-400 mb-2">פורמט: <span dir="ltr" className="font-mono bg-gray-100 px-1 rounded">מפתח:ערך|מפתח:ערך</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" dir="rtl" value={article.table_data_he || ""}
                    onChange={(e) => onUpdate(idx, "table_data_he", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                    placeholder="מפתח:ערך|מפתח:ערך"
                  />
                  <input type="text" dir="ltr" value={article.table_data_en || ""}
                    onChange={(e) => onUpdate(idx, "table_data_en", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                    placeholder="Key:Value|Key:Value"
                  />
                </div>
              </div>

              {/* Moti's Tip */}
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2.5">הטיפ של מוטי (Tip Box)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <BoldTextarea dir="rtl" rows={3} value={article.tip_he || ""}
                    onChange={(e) => onUpdate(idx, "tip_he", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white"
                    placeholder="הטיפ המקצועי של מוטי..."
                  />
                  <BoldTextarea dir="ltr" rows={3} value={article.tip_en || ""}
                    onChange={(e) => onUpdate(idx, "tip_en", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white"
                    placeholder="Moti's professional tip..."
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2.5">סיכום (Summary)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" dir="rtl" value={article.summary_he || ""}
                    onChange={(e) => onUpdate(idx, "summary_he", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                    placeholder="משפט סיכום חזק..."
                  />
                  <input type="text" dir="ltr" value={article.summary_en || ""}
                    onChange={(e) => onUpdate(idx, "summary_en", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                    placeholder="Strong closing statement..."
                  />
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
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
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/translations", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setTranslations(data);
          setArticles(Array.isArray(data.articles) ? data.articles : (defaultTranslations.articles as Article[]));
          setFaqs(Array.isArray(data.faqs) ? data.faqs : (defaultTranslations.faqs as Faq[]));
          setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : []);
        }
      } catch {
        setTranslations(defaultTranslations);
        setArticles(defaultTranslations.articles as Article[]);
        setFaqs(defaultTranslations.faqs as Faq[]);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── Auto-save (debounce 2s after last change) ─────────────────────────────
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dirty || saving) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => { handleSave(); }, 2000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, translations, articles, faqs, testimonials]);

  // ── Copy section to clipboard ─────────────────────────────────────────────
  const copySectionToClipboard = useCallback((sectionKey: SectionKey, sectionLabel: string, keys: string[]) => {
    const row = (key: string, lang: "he" | "en", val: string) => `  ${lang === "he" ? "עב" : "EN"} [${key}]: ${val}`;
    const lines: string[] = [
      `════════════════════════════════`,
      `  ${sectionLabel}`,
      `════════════════════════════════`,
      "",
    ];
    keys.forEach((key) => {
      const heVal = getSafeValue(translations, defaultTranslations, sectionKey, "he", key);
      const enVal = getSafeValue(translations, defaultTranslations, sectionKey, "en", key);
      lines.push(row(key, "he", heVal || "—"));
      lines.push(row(key, "en", enVal || "—"));
      lines.push("");
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedKey(sectionKey);
    setTimeout(() => setCopiedKey(null), 2000);
  }, [translations]);

  const copyFaqToClipboard = useCallback((faq: Faq, idx: number) => {
    const lines = [
      `════════════════════════════`,
      `  שאלה #${idx + 1}`,
      `════════════════════════════`,
      "",
      `  עב [question]: ${faq.question_he}`,
      `  EN [question]: ${faq.question_en}`,
      "",
      `  עב [answer]: ${faq.answer_he}`,
      `  EN [answer]: ${faq.answer_en}`,
    ].join("\n");
    navigator.clipboard.writeText(lines);
    setCopiedKey(`faq-${faq.id}`);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const copyAllFaqs = useCallback(() => {
    const lines: string[] = [];
    faqs.forEach((faq, idx) => {
      lines.push(`════════════════════════════`, `  שאלה #${idx + 1}`, `════════════════════════════`, "");
      lines.push(`  עב [question]: ${faq.question_he}`, `  EN [question]: ${faq.question_en}`, "");
      lines.push(`  עב [answer]: ${faq.answer_he}`, `  EN [answer]: ${faq.answer_en}`, "");
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedKey("all-faqs");
    setTimeout(() => setCopiedKey(null), 2000);
  }, [faqs]);

  const copyAllTestimonials = useCallback(() => {
    const lines: string[] = [];
    testimonials.forEach((t, idx) => {
      lines.push(`════════════════════════════`, `  עדות #${idx + 1} — ${t.name}`, `════════════════════════════`, "");
      lines.push(`  שם: ${t.name}`, `  עיר עב: ${t.city_he ?? ""}`, `  City EN: ${t.city_en ?? ""}`, "");
      lines.push(`  עב: ${t.text_he}`, `  EN: ${t.text_en}`, "");
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedKey("all-testimonials");
    setTimeout(() => setCopiedKey(null), 2000);
  }, [testimonials]);

  // ── Translation field change (text editor) ────────────────────────────────
  const handleChange = useCallback((lang: "en" | "he", key: string, value: string) => {
    if (activeTab === "faqs" || activeTab === "testimonials") return;
    setTranslations((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab as SectionKey],
        [lang]: { ...(prev[activeTab as SectionKey] as any)[lang], [key]: value },
      },
    }));
    setDirty(true);
  }, [activeTab]);

  // ── Media: write any section/lang/key ─────────────────────────────────────
  const handleMediaChange = useCallback((section: SectionKey, lang: "en" | "he", key: string, value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [section]: { ...prev[section], [lang]: { ...(prev[section] as any)?.[lang], [key]: value } },
    }));
    setDirty(true);
  }, []);

  // ── Portfolio series batch update ─────────────────────────────────────────
  const handleProjectImagesChange = useCallback((projKey: string, images: ProjectImage[]) => {
    setTranslations((prev) => {
      const p = prev.portfolio as any;
      const newEn = { ...(p.en || {}) };
      const newHe = { ...(p.he || {}) };
      for (const k of [...Object.keys(newEn), ...Object.keys(newHe)]) {
        if (k.startsWith(`${projKey}_img_`)) { delete newEn[k]; delete newHe[k]; }
      }
      images.forEach(({ url, alt }, i) => {
        newEn[`${projKey}_img_${i}`] = url; newHe[`${projKey}_img_${i}`] = url;
        newEn[`${projKey}_img_${i}_alt`] = alt; newHe[`${projKey}_img_${i}_alt`] = alt;
      });
      return { ...prev, portfolio: { en: newEn, he: newHe } };
    });
    setDirty(true);
  }, []);

  // ── Engineering images batch update ───────────────────────────────────────
  const handleEngineeringImagesChange = useCallback((images: ProjectImage[]) => {
    setTranslations((prev) => {
      const eng = prev.engineering as any;
      const newEn = { ...(eng.en || {}) };
      const newHe = { ...(eng.he || {}) };
      images.forEach(({ url, alt }, i) => {
        newEn[`imageUrl_${i}`] = url; newHe[`imageUrl_${i}`] = url;
        newEn[`imageAlt_${i}`] = alt; newHe[`imageAlt_${i}`] = alt;
      });
      return { ...prev, engineering: { en: newEn, he: newHe } };
    });
    setDirty(true);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/translations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...translations, articles, faqs, testimonials }),
      });
      if (res.ok) {
        setDirty(false);
        showToast("נשמר בהצלחה! האתר מתעדכן...", true);
        const ch = new BroadcastChannel("translations-sync");
        ch.postMessage("updated"); ch.close();
        try { await fetch("/api/revalidate", { method: "POST" }); } catch { /**/ }
      } else {
        const e = await res.json().catch(() => ({}));
        showToast(`שמירה נכשלה: ${e.error ?? "שגיאת שרת"}`, false);
      }
    } catch { showToast("שגיאת רשת. נסה שוב.", false); }
    finally { setSaving(false); }
  };

  // ── Article CRUD ──────────────────────────────────────────────────────────
  const addArticle = () => {
    setArticles((p) => [...p, {
      id: Date.now().toString(), slug: "",
      title_en: "", title_he: "",
      intro_en: "", intro_he: "",
      s1_title_en: "", s1_title_he: "", s1_body_en: "", s1_body_he: "",
      s2_title_en: "", s2_title_he: "", s2_body_en: "", s2_body_he: "",
      table_data_en: "", table_data_he: "",
      tip_en: "", tip_he: "",
      summary_en: "", summary_he: "",
      mainImage: "", mainImageAlt: "",
    }]);
    setDirty(true);
  };
  const updateArticle = (idx: number, field: keyof Article, value: string) => {
    setArticles((p) => p.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
    setDirty(true);
  };
  const deleteArticle = (idx: number) => {
    setArticles((p) => p.filter((_, i) => i !== idx));
    setDirty(true);
  };

  // ── FAQ CRUD ──────────────────────────────────────────────────────────────
  const addFaq = () => {
    setFaqs((p) => [...p, { id: Date.now().toString(), question_en: "", question_he: "", answer_en: "", answer_he: "" }]);
    setDirty(true);
  };
  const updateFaq = (idx: number, field: keyof Faq, value: string) => {
    setFaqs((p) => p.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
    setDirty(true);
  };
  const deleteFaq = (idx: number) => {
    setFaqs((p) => p.filter((_, i) => i !== idx));
    setDirty(true);
  };

  // ── Testimonial CRUD ──────────────────────────────────────────────────────
  const addTestimonial = () => {
    setTestimonials((p) => [...p, {
      id: Date.now().toString(),
      name: "", city_he: "", city_en: "",
      text_he: "", text_en: "",
      rating: 5, year: "", source: "Google",
    }]);
    setDirty(true);
  };
  const updateTestimonial = (idx: number, field: keyof Testimonial, value: string | number) => {
    setTestimonials((p) => p.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
    setDirty(true);
  };
  const deleteTestimonial = (idx: number) => {
    setTestimonials((p) => p.filter((_, i) => i !== idx));
    setDirty(true);
  };

  // ── Derived (above early return) ──────────────────────────────────────────
  const q = searchQuery.toLowerCase().trim();
  const section = activeTab !== "faqs" && activeTab !== "testimonials" ? (translations[activeTab as SectionKey] as any) : null;
  const allKeys: string[] = section?.en && section?.he
    ? Array.from(new Set([...Object.keys(section.en), ...Object.keys(section.he)]))
    : [];

  const matchingSections = useMemo(() => {
    if (!q) return null;
    return SECTIONS.filter((s) => {
      if (s.label.toLowerCase().includes(q) || s.key.toLowerCase().includes(q)) return true;
      const sec = translations[s.key] as any;
      if (!sec) return false;
      for (const lang of ["en", "he"] as const) {
        for (const [k, v] of Object.entries(sec[lang] ?? {})) {
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
      const he = getSafeValue(translations, defaultTranslations, activeTab as SectionKey, "he", key);
      const en = getSafeValue(translations, defaultTranslations, activeTab as SectionKey, "en", key);
      return he.toLowerCase().includes(q) || en.toLowerCase().includes(q);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, activeTab, translations]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8D775F] mb-4" />
      <p className="text-gray-600 font-medium">טוען נתונים...</p>
    </div>
  );

  // Tab button style helper
  const tabCls = (mode: EditorMode) =>
    `px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${
      editorMode === mode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col" dir="rtl">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-3 shrink-0 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">עורך התוכן</h1>
            <p className="text-sm text-gray-500 mt-0.5">בניין איתן — ניהול תוכן האתר</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/admin/backup"
              download
              className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold tracking-wide rounded-md hover:bg-gray-200 transition-colors border border-gray-200"
              title="הורד גיבוי JSON"
            >
              ⬇ גיבוי
            </a>
            {dirty && !saving && (
              <span className="text-xs text-amber-600 font-medium animate-pulse">שומר אוטומטית...</span>
            )}
            {saving && (
              <span className="text-xs text-gray-400 font-medium">שומר...</span>
            )}
            <button onClick={handleSave} disabled={!dirty || saving}
              className="px-6 py-2.5 bg-[#8D775F] text-white text-sm font-bold tracking-wide rounded-md disabled:opacity-40 hover:bg-[#7A6451] transition-colors shadow-sm">
              {saving ? "שומר..." : dirty ? "💾 שמור עכשיו" : "✓ נשמר"}
            </button>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button onClick={() => setEditorMode("content")} className={tabCls("content")}>עריכת תוכן</button>
          <button onClick={() => setEditorMode("media")} className={tabCls("media")}>
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="m3 16 5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="8.5" r="1.5" />
              </svg>
              ניהול מדיה
            </span>
          </button>
          <button onClick={() => setEditorMode("articles")} className={tabCls("articles")}>
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M4 6h16M4 10h16M4 14h10" strokeLinecap="round" />
              </svg>
              ניהול מאמרים
              {articles.length > 0 && (
                <span className="bg-[#8D775F]/20 text-[#8D775F] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {articles.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {/* Search — content mode only */}
        {editorMode === "content" && (
          <div className="relative" dir="ltr">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
            </svg>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sections, keys, or values…"
              className="w-full border border-gray-300 rounded-md pl-9 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            )}
          </div>
        )}
        {editorMode === "content" && q && matchingSections !== null && (
          <p className="text-xs text-gray-500">
            {matchingSections.length === 0 ? "לא נמצאו תוצאות." : `תוצאות ב: ${matchingSections.map((s) => s.label).join(", ")}`}
          </p>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 left-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-bold ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* ══════════════════ MEDIA MODE ══════════════════ */}
      {editorMode === "media" && (
        <div className="flex-1 overflow-y-auto p-8">
          <MediaManager
            translations={translations}
            onMediaChange={handleMediaChange}
            onProjectImagesChange={handleProjectImagesChange}
            onEngineeringImagesChange={handleEngineeringImagesChange}
          />
        </div>
      )}

      {/* ══════════════════ ARTICLES MODE ══════════════════ */}
      {editorMode === "articles" && (
        <div className="flex-1 overflow-y-auto p-8">
          <ArticlesManager
            articles={articles}
            onAdd={addArticle}
            onUpdate={updateArticle}
            onDelete={deleteArticle}
          />
        </div>
      )}

      {/* ══════════════════ CONTENT MODE ══════════════════ */}
      {editorMode === "content" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav className="w-56 shrink-0 bg-white border-l border-gray-200 overflow-y-auto" dir="rtl">
            {SECTIONS.map((s) => {
              const hasMatch = q && matchingSections ? matchingSections.some((ms) => ms.key === s.key) : false;
              return (
                <button key={s.key} onClick={() => setActiveTab(s.key)}
                  className={`w-full text-right px-5 py-3.5 text-sm font-medium border-b border-gray-100 transition-colors ${
                    activeTab === s.key
                      ? "bg-[#8D775F]/10 text-[#8D775F] border-r-4 border-r-[#8D775F]"
                      : hasMatch
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}>
                  {s.label}
                  {hasMatch && <span className="float-left text-amber-500 text-xs">●</span>}
                </button>
              );
            })}

            <div className="border-t-2 border-gray-200 mt-1">
              <p className="px-5 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-widest">CMS</p>
              <button onClick={() => setActiveTab("faqs")}
                className={`w-full text-right px-5 py-3.5 text-sm font-bold border-b border-gray-100 transition-colors ${
                  activeTab === "faqs"
                    ? "bg-[#8D775F]/10 text-[#8D775F] border-r-4 border-r-[#8D775F]"
                    : "text-gray-600 hover:bg-gray-50"
                }`}>
                שאלות נפוצות
              </button>
              <button onClick={() => setActiveTab("testimonials")}
                className={`w-full text-right px-5 py-3.5 text-sm font-bold border-b border-gray-100 transition-colors ${
                  activeTab === "testimonials"
                    ? "bg-[#8D775F]/10 text-[#8D775F] border-r-4 border-r-[#8D775F]"
                    : "text-gray-600 hover:bg-gray-50"
                }`}>
                עדויות לקוחות
                {testimonials.length > 0 && (
                  <span className="float-left bg-[#8D775F]/20 text-[#8D775F] text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5">
                    {testimonials.length}
                  </span>
                )}
              </button>
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-8" dir="rtl">
            <div className="max-w-5xl mx-auto">

              {/* FAQs */}
              {activeTab === "faqs" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">שאלות נפוצות</h2>
                      <p className="text-sm text-gray-500 mt-1">שאלות ותשובות קצרות — מוצגות כאקורדיון בעמוד שאלות נפוצות (/faq).</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {faqs.length > 0 && (
                        <button
                          onClick={copyAllFaqs}
                          className={`text-xs font-bold px-3 py-2 rounded-md border transition-colors ${
                            copiedKey === "all-faqs" ? "border-green-300 text-green-600 bg-green-50" : "border-gray-200 text-gray-500 hover:border-[#8D775F] hover:text-[#8D775F]"
                          }`}
                        >
                          {copiedKey === "all-faqs" ? "✓ הועתק" : "📋 העתק הכל"}
                        </button>
                      )}
                      <button onClick={addFaq} className="px-4 py-2 bg-[#8D775F] text-white text-sm font-bold rounded-md hover:bg-[#7A6451] transition-colors shadow-sm">
                        + הוסף שאלה
                      </button>
                    </div>
                  </div>
                  {faqs.length === 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm py-16 text-center">
                      <p className="text-gray-500 text-sm">אין שאלות עדיין.</p>
                    </div>
                  )}
                  <div className="space-y-6">
                    {faqs.map((faq, idx) => (
                      <div key={faq.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                          <span className="font-mono text-xs text-gray-400">#{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyFaqToClipboard(faq, idx)}
                              className={`text-xs font-bold px-3 py-1 rounded transition-colors ${
                                copiedKey === `faq-${faq.id}`
                                  ? "text-green-600 bg-green-50"
                                  : "text-[#8D775F] hover:bg-[#8D775F]/10"
                              }`}
                            >
                              {copiedKey === `faq-${faq.id}` ? "✓ הועתק" : "📋 העתק"}
                            </button>
                            <button onClick={() => deleteFaq(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-3 py-1 rounded hover:bg-red-50 transition-colors">מחק</button>
                          </div>
                        </div>
                        <div className="p-5 space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">שאלה (עברית)</label>
                              <input type="text" dir="rtl" value={faq.question_he} onChange={(e) => updateFaq(idx, "question_he", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white" placeholder="שאלה נפוצה" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">Question (English)</label>
                              <input type="text" dir="ltr" value={faq.question_en} onChange={(e) => updateFaq(idx, "question_en", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white" placeholder="Frequently asked question" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">תשובה (עברית)</label>
                              <BoldTextarea dir="rtl" rows={4} value={faq.answer_he} onChange={(e) => updateFaq(idx, "answer_he", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white" placeholder="תשובה לשאלה" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">Answer (English)</label>
                              <BoldTextarea dir="ltr" rows={4} value={faq.answer_en} onChange={(e) => updateFaq(idx, "answer_en", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white" placeholder="Answer to the question" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonials */}
              {activeTab === "testimonials" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">עדויות לקוחות</h2>
                      <p className="text-sm text-gray-500 mt-1">ביקורות / פידבקים — מוצגות בדף הבית בין תיק הפרויקטים לטופס הצור קשר.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {testimonials.length > 0 && (
                        <button
                          onClick={copyAllTestimonials}
                          className={`text-xs font-bold px-3 py-2 rounded-md border transition-colors ${
                            copiedKey === "all-testimonials" ? "border-green-300 text-green-600 bg-green-50" : "border-gray-200 text-gray-500 hover:border-[#8D775F] hover:text-[#8D775F]"
                          }`}
                        >
                          {copiedKey === "all-testimonials" ? "✓ הועתק" : "📋 העתק הכל"}
                        </button>
                      )}
                      <button onClick={addTestimonial} className="px-4 py-2 bg-[#8D775F] text-white text-sm font-bold rounded-md hover:bg-[#7A6451] transition-colors shadow-sm">
                        + הוסף עדות
                      </button>
                    </div>
                  </div>
                  {testimonials.length === 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm py-16 text-center">
                      <p className="text-gray-500 text-sm">אין עדויות עדיין. לחץ &quot;+ הוסף עדות&quot; כדי להוסיף.</p>
                    </div>
                  )}
                  <div className="space-y-6">
                    {testimonials.map((t, idx) => (
                      <div key={t.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                          <span className="font-mono text-xs text-gray-400">#{idx + 1}</span>
                          <button onClick={() => deleteTestimonial(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-3 py-1 rounded hover:bg-red-50 transition-colors">מחק</button>
                        </div>
                        <div className="p-5 space-y-5">
                          {/* Name + location */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">שם הלקוח</label>
                              <input type="text" value={t.name} onChange={(e) => updateTestimonial(idx, "name", e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                                placeholder="ישראל ישראלי / Israel Cohen" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">עיר (עברית)</label>
                              <input type="text" dir="rtl" value={t.city_he || ""} onChange={(e) => updateTestimonial(idx, "city_he", e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                                placeholder="ירושלים" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">City (English)</label>
                              <input type="text" dir="ltr" value={t.city_en || ""} onChange={(e) => updateTestimonial(idx, "city_en", e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                                placeholder="Jerusalem" />
                            </div>
                          </div>
                          {/* Text */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">טקסט (עברית)</label>
                              <BoldTextarea dir="rtl" rows={4} value={t.text_he} onChange={(e) => updateTestimonial(idx, "text_he", e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white"
                                placeholder="כתוב את הביקורת בעברית..." />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">Text (English)</label>
                              <BoldTextarea dir="ltr" rows={4} value={t.text_en} onChange={(e) => updateTestimonial(idx, "text_en", e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white"
                                placeholder="Write the review in English..." />
                            </div>
                          </div>
                          {/* Rating + year + source */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">דירוג (1–5)</label>
                              <select value={t.rating} onChange={(e) => updateTestimonial(idx, "rating", Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white">
                                {[5,4,3,2,1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">שנה (לא חובה)</label>
                              <input type="text" value={t.year || ""} onChange={(e) => updateTestimonial(idx, "year", e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white"
                                placeholder="2024" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">מקור</label>
                              <select value={t.source || "Google"} onChange={(e) => updateTestimonial(idx, "source", e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white">
                                <option value="Google">Google</option>
                                <option value="">ידני</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Standard section table */}
              {activeTab !== "faqs" && activeTab !== "testimonials" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {SECTIONS.find((s) => s.key === activeTab)?.label ?? activeTab}
                    </h2>
                    <button
                      onClick={() => {
                        const label = SECTIONS.find((s) => s.key === activeTab)?.label ?? String(activeTab);
                        copySectionToClipboard(activeTab as SectionKey, label, allKeys);
                      }}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md border transition-colors ${
                        copiedKey === activeTab
                          ? "border-green-300 text-green-600 bg-green-50"
                          : "border-gray-200 text-gray-500 hover:border-[#8D775F] hover:text-[#8D775F] hover:bg-[#8D775F]/5"
                      }`}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="4" width="8" height="8" rx="1.5" />
                        <path d="M1 9V2a1 1 0 0 1 1-1h7" />
                      </svg>
                      {copiedKey === activeTab ? "✓ הועתק!" : "העתק סקשן"}
                    </button>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-right px-5 py-4 font-bold text-gray-700 w-44">שדה</th>
                          <th className="text-right px-5 py-4 font-bold text-gray-700 w-1/3" dir="rtl">עברית</th>
                          <th className="text-left px-5 py-4 font-bold text-gray-700 w-1/3" dir="ltr">English</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredKeys.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-5 py-10 text-center text-gray-500">
                              {q ? "לא נמצאו תוצאות." : "אין שדות בקטגוריה זו."}
                            </td>
                          </tr>
                        ) : filteredKeys.map((key) => {
                          const heVal = getSafeValue(translations, defaultTranslations, activeTab as SectionKey, "he", key);
                          const enVal = getSafeValue(translations, defaultTranslations, activeTab as SectionKey, "en", key);
                          const isLong = heVal.length > 50 || enVal.length > 50 || heVal.includes("\n") || enVal.includes("\n");
                          const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(heVal || enVal) ||
                            ["image", "cover", "photo", "src", "url"].some((w) => key.toLowerCase().includes(w));

                          return (
                            <tr key={key} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                              <td className="px-5 py-4 font-mono text-xs text-gray-500 align-top">
                                {key}
                                {isImg && (heVal || enVal) && (
                                  <div className="mt-1.5 w-12 h-9 rounded overflow-hidden border border-gray-200">
                                    <ImageThumb src={heVal || enVal} className="w-full h-full" />
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-4 align-top" dir="rtl">
                                {isLong
                                  ? <BoldTextarea value={heVal} onChange={(e) => handleChange("he", key, e.target.value)} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white" dir="rtl" />
                                  : <input type="text" value={heVal} onChange={(e) => handleChange("he", key, e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold text-right focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white" dir="rtl" />
                                }
                              </td>
                              <td className="px-5 py-4 align-top" dir="ltr">
                                {isLong
                                  ? <BoldTextarea value={enVal} onChange={(e) => handleChange("en", key, e.target.value)} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none resize-y bg-white" />
                                  : <input type="text" value={enVal} onChange={(e) => handleChange("en", key, e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black font-semibold focus:ring-2 focus:ring-[#8D775F] focus:border-transparent outline-none bg-white" />
                                }
                              </td>
                            </tr>
                          );
                        })}
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
