"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";

// ── Data ──────────────────────────────────────────────────────────────────────

const ITEMS = [
  { src: "/precision-tiling-with-laser-alignment.jpg" },
  { src: "/structural-foundation-reinforcement.jpg" },
  { src: "/luxury-electrical-infrastructure-precision.jpg" },
  { src: "/expert-jerusalem-stone-facade-work.jpg" },
  { src: "/professional-airless-painting-standards.jpg" },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Component ─────────────────────────────────────────────────────────────────

export default function EngineeringExcellence() {
  const { lang } = useLang();
  const l = lang as "en" | "he";
  const ui = useTranslations("engineering", l);
  const ut = ui as Record<string, string>;

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = ITEMS.length;

  const closeLightbox = useCallback(() => setActiveIndex(null), []);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i !== null ? (i - 1 + total) % total : 0));
  }, [total]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i !== null ? (i + 1) % total : 0));
  }, [total]);

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

  useEffect(() => {
    document.body.style.overflow = activeIndex !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeIndex]);

  return (
    <>
      <section className="bg-charcoal py-14 md:py-20">
        <div className="mx-auto max-w-[1440px] px-8">

          {/* Header */}
          <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6 text-start">
            <div>
              <p className="overline-label !text-warm-gray mb-5">
                <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
                {ui.overline}
              </p>
              <h2 className="font-heading text-3xl leading-snug font-bold text-bone md:text-4xl lg:text-5xl">
                {ui.title}
              </h2>
            </div>
            <p className="font-body text-sm font-light text-bone/40 max-w-xs">
              {ui.sub}
            </p>
          </div>

          {/* 3-column grid of expertise images */}
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {ITEMS.map((item, index) => {
              const label = ut[`item_${index}_label`] ?? "";
              return (
                <motion.button
                  key={item.src}
                  onClick={() => setActiveIndex(index)}
                  className="group relative aspect-square w-full overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: (index % 3) * 0.07, ease }}
                  aria-label={label}
                >
                  {/* Photo */}
                  <Image
                    src={item.src}
                    alt={label}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-charcoal/0 transition-colors duration-500 group-hover:bg-charcoal/65" />

                  {/* Centered label — fades in */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <div className="h-px w-8 bg-accent" />
                    <span className="font-body text-[0.6rem] font-semibold tracking-[0.22em] uppercase text-bone text-center px-4 leading-relaxed">
                      {label}
                    </span>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 start-0 h-px w-0 bg-accent transition-all duration-700 ease-[var(--ease-expo)] group-hover:w-full" />
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeLightbox}
          >
            {/* Prev */}
            <button
              onClick={(e) => { e.stopPropagation(); lang === "he" ? goNext() : goPrev(); }}
              className="absolute start-4 top-1/2 -translate-y-1/2 z-10 grid size-12 place-items-center text-white/40 hover:text-white transition-colors duration-300"
              aria-label={ui.prev}
            >
              <ChevronLeft size={28} />
            </button>

            {/* Next */}
            <button
              onClick={(e) => { e.stopPropagation(); lang === "he" ? goPrev() : goNext(); }}
              className="absolute end-4 top-1/2 -translate-y-1/2 z-10 grid size-12 place-items-center text-white/40 hover:text-white transition-colors duration-300"
              aria-label={ui.next}
            >
              <ChevronRight size={28} />
            </button>

            {/* Image container — swipeable */}
            <motion.div
              className="relative"
              style={{ width: "min(80vw, 480px)", height: "min(80vh, 640px)" }}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_: unknown, info: PanInfo) => {
                if (info.offset.x < -60) lang === "he" ? goPrev() : goNext();
                if (info.offset.x > 60) lang === "he" ? goNext() : goPrev();
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Crossfade on image change */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={ITEMS[activeIndex].src}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Image
                    src={ITEMS[activeIndex].src}
                    alt={ut[`item_${activeIndex}_label`] ?? ""}
                    fill
                    sizes="(max-width: 480px) 80vw, 480px"
                    className="object-contain"
                    priority
                  />
                </motion.div>
              </AnimatePresence>

              {/* Caption */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-7 text-start pointer-events-none z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px w-5 bg-accent flex-shrink-0" />
                  <p className="font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-accent">
                    {ui.overline}
                  </p>
                </div>
                <h3 className="font-body text-base font-semibold tracking-[0.1em] uppercase text-white">
                  {ut[`item_${activeIndex}_label`]}
                </h3>
              </div>

              {/* Frame */}
              <div className="absolute inset-0 border border-white/[0.06] pointer-events-none z-10" />
            </motion.div>

            {/* Counter */}
            <p className="mt-5 font-body text-xs text-white/35 tracking-[0.15em] tabular-nums select-none pointer-events-none">
              {activeIndex + 1} / {total}
            </p>

            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-5 end-5 grid size-11 place-items-center border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors duration-300"
              aria-label={ui.close}
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
