"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "./LangContext";

const copy = {
  en: {
    overline: "Selected Work",
    title: "Portfolio",
    items: [
      { num: "01", title: "Jerusalem Villa", category: "Luxury Construction", src: "/portfolio/project-01.jpg" },
      { num: "02", title: "Penthouse Suite", category: "Structural Engineering", src: "/portfolio/project-02.jpg" },
      { num: "03", title: "Garden Terrace", category: "Premium Renovation", src: "/portfolio/project-03.jpg" },
      { num: "04", title: "Hillside Residence", category: "Luxury Construction", src: "/portfolio/project-04.jpg" },
      { num: "05", title: "Urban Complex", category: "Project Management", src: "/portfolio/project-05.jpg" },
      { num: "06", title: "Heritage Restoration", category: "Structural Engineering", src: "/portfolio/project-06.jpg" },
    ],
    close: "Close",
    prev: "Previous",
    next: "Next",
    placeholder: "Image coming soon",
  },
  he: {
    overline: "עבודות נבחרות",
    title: "תיק עבודות",
    items: [
      { num: "01", title: "וילה ירושלמית", category: "בניית וילות פרימיום", src: "/portfolio/project-01.jpg" },
      { num: "02", title: "פנטהאוז", category: "הנדסת קונסטרוקציה", src: "/portfolio/project-02.jpg" },
      { num: "03", title: "גן טרס", category: "שיפוץ פרימיום", src: "/portfolio/project-03.jpg" },
      { num: "04", title: "בית הר", category: "בניית וילות פרימיום", src: "/portfolio/project-04.jpg" },
      { num: "05", title: "מתחם עירוני", category: "ניהול פרויקטים", src: "/portfolio/project-05.jpg" },
      { num: "06", title: "שימור מורשת", category: "הנדסת קונסטרוקציה", src: "/portfolio/project-06.jpg" },
    ],
    close: "סגור",
    prev: "קודם",
    next: "הבא",
    placeholder: "תמונה בקרוב",
  },
} as const;

// Subtle stone/neutral gradients for placeholders
const placeholderStyles = [
  { bg: "from-stone-200 via-stone-300 to-stone-400", grid: "20px 20px" },
  { bg: "from-zinc-200 via-zinc-300 to-zinc-400", grid: "32px 32px" },
  { bg: "from-neutral-200 via-stone-300 to-neutral-400", grid: "24px 24px" },
  { bg: "from-slate-200 via-slate-300 to-zinc-300", grid: "16px 16px" },
  { bg: "from-gray-200 via-stone-200 to-gray-300", grid: "28px 28px" },
  { bg: "from-stone-300 via-neutral-200 to-stone-300", grid: "20px 20px" },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

function PlaceholderImage({ index, className = "" }: { index: number; className?: string }) {
  const style = placeholderStyles[index % placeholderStyles.length];
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} ${className}`}>
      {/* Architectural grid texture — purely decorative */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)",
          backgroundSize: style.grid,
        }}
      />
    </div>
  );
}

export default function PortfolioGallery() {
  const { lang } = useLang();
  const { overline, title, items, close, prev, next, placeholder } = copy[lang];

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => setActiveIndex(index), []);
  const closeLightbox = useCallback(() => setActiveIndex(null), []);

  const goPrev = useCallback(() => {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex - 1 + items.length) % items.length);
  }, [activeIndex, items.length]);

  const goNext = useCallback(() => {
    if (activeIndex === null) return;
    setActiveIndex((activeIndex + 1) % items.length);
  }, [activeIndex, items.length]);

  // Keyboard navigation
  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lang === "he" ? goNext() : goPrev();
      if (e.key === "ArrowRight") lang === "he" ? goPrev() : goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, closeLightbox, goPrev, goNext, lang]);

  // Lock scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = activeIndex !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeIndex]);

  return (
    <>
      <section id="portfolio" className="bg-bone py-36 md:py-48">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          {/* Header */}
          <div className="mb-16 md:mb-20 text-start">
            <p className="overline-label mb-6">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              {overline}
            </p>
            <h2 className="font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl max-w-xl">
              {title}
            </h2>
          </div>

          {/* Responsive Gallery Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <motion.button
                key={item.num}
                onClick={() => openLightbox(index)}
                className="group relative aspect-[4/3] w-full overflow-hidden cursor-pointer block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.65, delay: index * 0.07, ease }}
                aria-label={`${item.title} — ${item.category}`}
              >
                {/* Placeholder image */}
                <PlaceholderImage index={index} className="transition-transform duration-700 group-hover:scale-105" />

                {/* Watermark number — very low opacity */}
                <span
                  className="absolute bottom-3 end-4 font-heading text-[7rem] font-bold text-charcoal/[0.06] select-none leading-none pointer-events-none"
                  aria-hidden="true"
                >
                  {item.num}
                </span>

                {/* Category chip — always visible */}
                <div className="absolute start-0 top-0 m-4">
                  <span className="font-body text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-charcoal/60 bg-white/75 backdrop-blur-sm px-2.5 py-1.5">
                    {item.category}
                  </span>
                </div>

                {/* Dark overlay on hover */}
                <div className="absolute inset-0 bg-charcoal/0 transition-colors duration-500 group-hover:bg-charcoal/50" />

                {/* Info overlay — slides up on hover */}
                <div className="absolute inset-x-0 bottom-0 translate-y-full p-6 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-y-0">
                  <p className="font-body text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-accent mb-1.5">
                    {item.category}
                  </p>
                  <h3 className="font-heading text-lg font-bold text-bone leading-snug">
                    {item.title}
                  </h3>
                </div>

                {/* Corner accent line — decorative */}
                <div className="absolute start-0 bottom-0 h-px w-0 bg-accent transition-all duration-700 ease-[var(--ease-expo)] group-hover:w-full" />
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeLightbox}
          >
            {/* Main image container */}
            <motion.div
              className="relative w-full max-w-5xl mx-16 aspect-[4/3]"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Placeholder */}
              <PlaceholderImage index={activeIndex} />

              {/* Watermark number */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                <span className="font-heading font-bold text-white/[0.04] select-none leading-none" style={{ fontSize: "clamp(8rem, 22vw, 22rem)" }}>
                  {items[activeIndex].num}
                </span>
              </div>

              {/* Placeholder label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="font-body text-xs font-semibold tracking-[0.3em] uppercase text-white/20">
                    {placeholder}
                  </p>
                </div>
              </div>

              {/* Caption bar */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-8 text-start">
                <p className="font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-accent mb-2">
                  {items[activeIndex].category}
                </p>
                <h3 className="font-heading text-2xl md:text-3xl font-bold text-white">
                  {items[activeIndex].title}
                </h3>
              </div>

              {/* Border accent */}
              <div className="absolute inset-0 border border-white/[0.06] pointer-events-none" />
            </motion.div>

            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-5 end-5 grid size-11 place-items-center border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors duration-300"
              aria-label={close}
            >
              <X size={20} />
            </button>

            {/* Prev button */}
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute start-4 top-1/2 -translate-y-1/2 grid size-12 place-items-center text-white/40 hover:text-white transition-colors duration-300"
              aria-label={prev}
            >
              {lang === "he" ? <ChevronRight size={30} /> : <ChevronLeft size={30} />}
            </button>

            {/* Next button */}
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute end-4 top-1/2 -translate-y-1/2 grid size-12 place-items-center text-white/40 hover:text-white transition-colors duration-300"
              aria-label={next}
            >
              {lang === "he" ? <ChevronLeft size={30} /> : <ChevronRight size={30} />}
            </button>

            {/* Counter */}
            <div className="absolute bottom-5 inset-x-0 flex justify-center">
              <div className="flex items-center gap-2">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                    className={`h-px transition-all duration-300 ${
                      i === activeIndex ? "w-8 bg-accent" : "w-4 bg-white/20 hover:bg-white/40"
                    }`}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
