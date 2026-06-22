"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLightboxHistory } from "../hooks/useLightboxHistory";
import { GALLERY_PROJECTS, type GalleryProject, type ProjectCategory } from "../../lib/projects";

// ── Types ──────────────────────────────────────────────────────────────────────

type Lang = "he" | "en";
type FilterKey = "all" | ProjectCategory;

// ── Filter definitions ─────────────────────────────────────────────────────────

const FILTERS: { key: FilterKey; he: string; en: string }[] = [
  { key: "all",           he: "כולם",           en: "All" },
  { key: "construction",  he: "בינוי",           en: "Construction" },
  { key: "renovations",   he: "שיפוצים",         en: "Renovations" },
  { key: "finish",        he: "עבודות גמר",      en: "Finish Work" },
  { key: "infrastructure",he: "תשתיות",          en: "Infrastructure" },
  { key: "plastering",    he: "טיח",             en: "Plastering" },
  { key: "painting",      he: "צבע",             en: "Painting" },
  { key: "waterproofing", he: "איטום",           en: "Waterproofing" },
  { key: "tiling",        he: "ריצוף וחיפוי",    en: "Tiling" },
  { key: "aluminum",      he: "אלומיניום",       en: "Aluminum" },
  { key: "drywall",       he: "גבס",             en: "Drywall" },
  { key: "ac",            he: "מיזוג אוויר",     en: "AC" },
  { key: "carpentry",     he: "נגרות",           en: "Carpentry" },
  { key: "handover",      he: "ניקיון ומסירה",   en: "Handover" },
  { key: "before-after",  he: "לפני ואחרי",      en: "Before & After" },
];

// Slugs whose dedicated detail page is still in preparation — must mirror
// the BLOCKED_PROJECT_SLUGS set in src/proxy.ts. Photos still appear in
// the in-page lightbox (the gallery's main draw), but the "Project Page"
// link is hidden for these until the content lands.
const SLUGS_WITHOUT_DETAIL_PAGE = new Set([
  "bayit-vegan-luxury-apartment",
  "ohel-avshalom-synagogue-jerusalem",
  "ramat-eshkol-penthouse",
  "jerusalem-luxury-residence",
]);

// ── Component ──────────────────────────────────────────────────────────────────

export default function ProjectsGallery({ lang }: { lang: Lang }) {
  const dir = lang === "he" ? "rtl" : "ltr";
  const homeHref = lang === "he" ? "/he" : "/en";

  // Start with static data (instant render), then hydrate from Cloudinary API
  const [projects, setProjects] = useState<GalleryProject[]>(GALLERY_PROJECTS);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [openProject, setOpenProject] = useState<number | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  // Fetch live data from Cloudinary on mount — silently replaces static data
  useEffect(() => {
    fetch("/api/cloudinary-gallery")
      .then((r) => r.json())
      .then((data: GalleryProject[]) => {
        if (Array.isArray(data) && data.length > 0) setProjects(data);
      })
      .catch(() => {
        // silently keep static fallback data on any error
      });
  }, []);

  const filtered =
    activeFilter === "all"
      ? projects
      : projects.filter((p) => p.categories.includes(activeFilter as ProjectCategory));

  // Show only category filters that have at least one matching project. "All"
  // stays visible always so the bar never collapses to zero buttons. Empty
  // categories from FILTERS (e.g. painting, plastering — defined but unused
  // until tagged images exist) are hidden until the data warrants them.
  const visibleFilters = useMemo(() => {
    const present = new Set<ProjectCategory>();
    for (const p of projects) for (const c of p.categories) present.add(c);
    return FILTERS.filter(
      (f) => f.key === "all" || present.has(f.key as ProjectCategory)
    );
  }, [projects]);

  const project = openProject !== null ? projects[openProject] : null;
  const series = project?.images ?? [];
  const totalImages = series.length;

  const openLightbox = useCallback((projIdx: number) => {
    setOpenProject(projIdx);
    setActiveImage(0);
  }, []);

  const closeLightbox = useCallback(() => {
    setOpenProject(null);
    setActiveImage(0);
  }, []);

  const goPrev = useCallback(
    () => setActiveImage((i) => (i - 1 + totalImages) % totalImages),
    [totalImages]
  );
  const goNext = useCallback(
    () => setActiveImage((i) => (i + 1) % totalImages),
    [totalImages]
  );

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (openProject === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lang === "he" ? goNext() : goPrev();
      if (e.key === "ArrowRight") lang === "he" ? goPrev() : goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openProject, lang, closeLightbox, goPrev, goNext]);

  // Lock scroll while lightbox is open
  useEffect(() => {
    document.body.style.overflow = openProject !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [openProject]);

  // Back button closes lightbox instead of navigating away
  useLightboxHistory(openProject !== null, closeLightbox);

  // Swipe to navigate in lightbox
  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (Math.abs(info.offset.x) < 50) return;
      if (info.offset.x > 0) lang === "he" ? goNext() : goPrev();
      else lang === "he" ? goPrev() : goNext();
    },
    [lang, goPrev, goNext]
  );

  return (
    <main className="relative bg-bone min-h-screen" dir={dir}>
      <Navbar />

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-10 px-6 md:px-12">
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-charcoal/40 mb-6">
            <Link href={homeHref} className="hover:text-accent transition-colors">
              {lang === "he" ? "ראשי" : "Home"}
            </Link>
            <span>/</span>
            <span className="text-charcoal/60">{lang === "he" ? "פרויקטים" : "Projects"}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-3">
            {lang === "he" ? "תיק עבודות" : "Portfolio"}
          </p>
          <h1 className="text-5xl md:text-6xl font-light text-charcoal mb-4 leading-tight">
            {lang === "he" ? "הפרויקטים שלנו" : "Our Projects"}
          </h1>
          <p className="text-lg font-light text-charcoal/60 max-w-2xl leading-relaxed">
            {lang === "he"
              ? "ממתחמים ציבוריים ועד שיפוצי יוקרה — כל פרויקט בנוי לרמת דיוק הנדסי."
              : "From institutional complexes to luxury renovations — every project built to engineering exactitude."}
          </p>
        </motion.div>
      </section>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-bone/95 backdrop-blur-sm border-b border-warm-gray/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div
            className="flex flex-nowrap gap-2 py-3 overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {visibleFilters.map((f) => {
              const count =
                f.key === "all"
                  ? projects.length
                  : projects.filter((p) =>
                      p.categories.includes(f.key as ProjectCategory)
                    ).length;
              const isActive = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-light transition-all duration-200 ${
                    isActive
                      ? "bg-charcoal text-bone"
                      : "border border-charcoal/20 text-charcoal/60 hover:border-charcoal/50 hover:text-charcoal"
                  }`}
                >
                  {lang === "he" ? f.he : f.en}
                  <span
                    className={`text-[10px] min-w-[18px] text-center px-1 py-0.5 rounded-full ${
                      isActive ? "bg-white/20 text-bone" : "bg-charcoal/10 text-charcoal/40"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Masonry Grid ───────────────────────────────────────────────────── */}
      <section className="py-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-32 text-center"
              >
                <p className="text-charcoal/30 text-2xl font-light mb-2">—</p>
                <p className="text-charcoal/40 text-base font-light">
                  {lang === "he" ? "תוכן בהכנה — בקרוב" : "Content coming soon"}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={activeFilter}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="columns-1 sm:columns-2 lg:columns-3 gap-4"
              >
                {filtered.map((proj, idx) => {
                  const projIdx = GALLERY_PROJECTS.indexOf(proj);
                  const aspectClass =
                    proj.aspect === "3/4"
                      ? "aspect-[3/4]"
                      : proj.aspect === "16/9"
                      ? "aspect-[16/9]"
                      : proj.aspect === "1/1"
                      ? "aspect-square"
                      : "aspect-[4/3]";
                  return (
                    <motion.article
                      key={proj.id}
                      className="break-inside-avoid mb-4 group cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: idx * 0.07,
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onClick={() => openLightbox(projIdx)}
                    >
                      {/* ── Image container ── */}
                      <div className={`relative w-full ${aspectClass} overflow-hidden bg-warm-gray/20`}>
                        <Image
                          src={proj.cover}
                          alt={
                            lang === "he"
                              ? `${proj.he.title} | בניין איתן`
                              : `${proj.en.title} | Binyan Eitan`
                          }
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 ease-out-quart group-hover:scale-105"
                        />

                        {/* Dark overlay on hover */}
                        <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/55 transition-all duration-300" />

                        {/* Category chip — top leading corner */}
                        <div
                          className={`absolute top-3 ${
                            lang === "he" ? "right-3" : "left-3"
                          }`}
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-widest bg-bone/90 text-charcoal px-2 py-1">
                            {lang === "he" ? proj.he.category : proj.en.category}
                          </span>
                        </div>

                        {/* Image count — top trailing corner */}
                        <div
                          className={`absolute top-3 ${
                            lang === "he" ? "left-3" : "right-3"
                          }`}
                        >
                          <span className="flex items-center gap-1 text-[10px] font-light text-bone/80 bg-charcoal/60 backdrop-blur-sm px-2 py-1">
                            <Images size={9} />
                            {proj.images.length}
                          </span>
                        </div>

                        {/* Slide-up info on hover */}
                        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                          <p className="text-white/60 text-[10px] font-semibold uppercase tracking-[0.2em] mb-1">
                            {proj.num}
                          </p>
                          <h2 className="text-white text-xl font-light mb-3">
                            {lang === "he" ? proj.he.title : proj.en.title}
                          </h2>
                          <div className="flex items-center gap-2">
                            <span className="inline-block text-[10px] uppercase tracking-widest text-bone/70 border border-bone/30 px-3 py-1.5">
                              {lang === "he" ? "פתח גלריה" : "View Gallery"}
                            </span>
                            {!SLUGS_WITHOUT_DETAIL_PAGE.has(proj.urlSlug) && (
                              <Link
                                href={`/${lang}/projects/${proj.urlSlug}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-block text-[10px] uppercase tracking-widest text-bone bg-accent/80 hover:bg-accent px-3 py-1.5 transition-colors"
                              >
                                {lang === "he" ? "דף פרויקט" : "Project Page"}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile caption — always visible on small screens */}
                      <div className="sm:hidden px-1 pt-2 pb-1">
                        <p className="text-[10px] uppercase tracking-widest text-accent mb-0.5">
                          {lang === "he" ? proj.he.category : proj.en.category}
                        </p>
                        <p className="text-sm font-light text-charcoal">
                          {lang === "he" ? proj.he.title : proj.en.title}
                        </p>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── CTA Section ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center border-t border-warm-gray/20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent mb-4">
            {lang === "he" ? "מוכנים להתחיל?" : "Ready to start?"}
          </p>
          <h2 className="text-3xl md:text-4xl font-light text-charcoal mb-4">
            {lang === "he" ? "הפרויקט שלכם הוא הבא" : "Your project is next"}
          </h2>
          <p className="text-charcoal/65 font-light mb-8 max-w-md mx-auto leading-relaxed">
            {lang === "he"
              ? "צרו קשר ונבנה יחד משהו שעומד בזמן."
              : "Get in touch and let's build something that lasts."}
          </p>
          <Link
            href={`${homeHref}#contact`}
            className="inline-block px-10 py-3.5 bg-charcoal text-bone text-xs font-light uppercase tracking-[0.2em] hover:bg-accent transition-colors duration-300"
          >
            {lang === "he" ? "צרו קשר" : "Contact Us"}
          </Link>
        </motion.div>
      </section>

      <Footer />

      {/* ── Lightbox ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {openProject !== null && project && (
          <motion.div
            className="fixed inset-0 z-[9999] flex flex-col"
            style={{ backgroundColor: "rgba(45,41,38,0.97)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 md:px-8 py-4 shrink-0">
              {/* Title + category */}
              <div>
                <p className="text-bone/40 text-[10px] uppercase tracking-widest">
                  {lang === "he" ? project.he.category : project.en.category}
                </p>
                <p className="text-bone/80 text-sm font-light">
                  {lang === "he" ? project.he.title : project.en.title}
                </p>
              </div>
              {/* Counter + close */}
              <div className="flex items-center gap-6">
                <span className="text-bone/40 text-sm font-light tabular-nums">
                  {activeImage + 1} / {totalImages}
                </span>
                <button
                  onClick={closeLightbox}
                  className="text-bone/50 hover:text-bone transition-colors"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Image area */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              {/* Prev arrow */}
              <button
                onClick={lang === "he" ? goNext : goPrev}
                className="absolute left-3 md:left-6 z-10 text-bone/30 hover:text-bone transition-colors p-3"
                aria-label="Previous"
              >
                <ChevronLeft size={32} />
              </button>

              {/* Next arrow */}
              <button
                onClick={lang === "he" ? goPrev : goNext}
                className="absolute right-3 md:right-6 z-10 text-bone/30 hover:text-bone transition-colors p-3"
                aria-label="Next"
              >
                <ChevronRight size={32} />
              </button>

              {/* Swipeable image */}
              <motion.div
                className="w-full h-full px-14 md:px-20 py-4 flex items-center justify-center"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={onDragEnd}
              >
                <div className="relative w-full max-w-5xl h-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={series[activeImage]}
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Image
                        src={series[activeImage]}
                        alt={
                          lang === "he"
                            ? `${project.he.title} — תמונה ${activeImage + 1}`
                            : `${project.en.title} — image ${activeImage + 1}`
                        }
                        fill
                        className="object-contain"
                        priority
                        sizes="100vw"
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>

            {/* Thumbnail strip */}
            <div
              className="shrink-0 px-4 pb-4 pt-2"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="flex gap-1.5 overflow-x-auto justify-center">
                {series.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setActiveImage(i)}
                    className={`shrink-0 w-12 h-9 relative overflow-hidden transition-opacity duration-200 ${
                      i === activeImage ? "opacity-100 ring-1 ring-bone/60" : "opacity-30 hover:opacity-60"
                    }`}
                  >
                    <Image
                      src={src}
                      alt={`${project?.[lang].title ?? ""} — ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
