"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";

// ── Project data ──────────────────────────────────────────────────────────────

const PROJECTS = [
  {
    num: "01",
    cover: "/amshinov-1.jpg",
    series: [
      "/amshinov-1.jpg",
      "/amshinov-01.jpg",
      "/amshinov-2.jpg",
      "/amshinov-3.jpg",
      "/amshinov-4.jpg",
      "/amshinov-5.jpg",
      "/amshinov-6.jpg",
      "/amshinov-7.jpg",
      "/amshinov-8.jpg",
      "/amshinov-9.jpg",
      "/amshinov-10.jpg",
      "/amshinov-11.jpg",
      "/amshinov-12.jpg",
      "/amshinov-13.jpg",
      "/amshinov-14.jpg",
      "/amshinov-15.jpg",
      "/amshinov-16.jpg",
      "/amshinov-17.jpg",
      "/amshinov-18.jpg",
      "/amshinov-19.jpg",
      "/amshinov-20.jpg",
      "/amshinov-21.jpg",
      "/amshinov-22.jpg",
      "/amshinov-23.jpg",
    ],
  },
  {
    num: "02",
    cover: "/bayit-vegan.jpg",
    series: [
      "/bayit-vegan-1.jpg",
      "/bayit-vegan-2.jpg",
      "/bayit-vegan-3.jpg",
      "/bayit-vegan-4.jpg",
      "/bayit-vegan-5.jpg",
      "/bayit-vegan-6.jpg",
      "/bayit-vegan-7.jpg",
      "/bayit-vegan-8.jpg",
      "/bayit-vegan-9.jpg",
      "/bayit-vegan-10.jpg",
      "/bayit-vegan-11.jpg",
      "/bayit-vegan-12.jpg",
      "/bayit-vegan-13.jpg",
      "/bayit-vegan-14.jpg",
      "/bayit-vegan-15.jpg",
      "/bayit-vegan-16.jpg",
      "/bayit-vegan-17.jpg",
      "/bayit-vegan-18.jpg",
      "/bayit-vegan-19.jpg",
    ],
  },
  {
    num: "03",
    cover: "/ohel-avshalom.jpg",
    series: [
      "/ohel-avshalom-1.jpg",
      "/ohel-avshalom-2.jpg",
      "/ohel-avshalom-3.jpg",
      "/ohel-avshalom-4.jpg",
      "/ohel-avshalom-5.jpg",
      "/ohel-avshalom-6.jpg",
      "/ohel-avshalom-7.jpg",
      "/ohel-avshalom-8.jpg",
      "/ohel-avshalom-9.jpg",
      "/ohel-avshalom-10.jpg",
      "/ohel-avshalom-11.jpg",
      "/ohel-avshalom-12.jpg",
      "/ohel-avshalom-13.jpg",
      "/ohel-avshalom-14.jpg",
      "/ohel-avshalom-15.jpg",
    ],
  },
  {
    num: "04",
    cover: "/ramat-eshkol.jpg",
    series: [
      "/ramat-eshkol-penthouse-1.jpg",
      "/ramat-eshkol-penthouse-2.jpg",
      "/ramat-eshkol-penthouse-3.jpg",
      "/ramat-eshkol-penthouse-4.jpg",
      "/ramat-eshkol-penthouse-5.jpg",
      "/ramat-eshkol-penthouse-6.jpg",
      "/ramat-eshkol-penthouse-7.jpg",
      "/ramat-eshkol-penthouse-8.jpg",
      "/ramat-eshkol-penthouse-9.jpg",
    ],
  },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PortfolioGallery() {
  const { lang } = useLang();
  const l = lang as "en" | "he";
  const ui = useTranslations("portfolio", l);
  const ut = ui as Record<string, string>;

  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  const project = activeProject !== null ? PROJECTS[activeProject] : null;
  const series = project?.series ?? [];
  const totalImages = series.length;

  const openLightbox = useCallback((projIndex: number) => {
    setActiveProject(projIndex);
    setActiveImage(0);
  }, []);

  const closeLightbox = useCallback(() => {
    setActiveProject(null);
    setActiveImage(0);
  }, []);

  const goPrev = useCallback(() => {
    setActiveImage((i) => (i - 1 + totalImages) % totalImages);
  }, [totalImages]);

  const goNext = useCallback(() => {
    setActiveImage((i) => (i + 1) % totalImages);
  }, [totalImages]);

  // Keyboard navigation
  useEffect(() => {
    if (activeProject === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lang === "he" ? goNext() : goPrev();
      if (e.key === "ArrowRight") lang === "he" ? goPrev() : goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeProject, closeLightbox, goPrev, goNext, lang]);

  // Lock scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = activeProject !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeProject]);

  return (
    <>
      {/* ── Gallery Section ── */}
      <section id="portfolio" className="scroll-mt-20 bg-bone py-16 md:py-24">
        <div className="mx-auto max-w-[1440px] px-8">

          {/* Header */}
          <div className="mb-10 md:mb-14 text-start">
            {ui.overline && (
              <p className="overline-label mb-6">
                <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
                {ui.overline}
              </p>
            )}
            <h2 className="font-heading text-4xl leading-snug font-bold text-charcoal md:text-5xl lg:text-6xl xl:text-7xl max-w-xl">
              {ui.title}
            </h2>
          </div>

          {/* 3-column grid */}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((proj, index) => {
              const title = ut[`proj_${index}_title`] ?? "";
              const category = ut[`proj_${index}_category`] ?? "";
              return (
                <motion.button
                  key={proj.num}
                  onClick={() => openLightbox(index)}
                  className="group relative aspect-[4/5] w-full overflow-hidden cursor-pointer block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.65, delay: index * 0.1, ease }}
                  aria-label={`${title} — ${category}`}
                >
                  {/* Cover image */}
                  <Image
                    src={proj.cover}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority={index < 3}
                  />

                  {/* Category chip */}
                  <div className="absolute start-0 top-0 m-4 z-10">
                    <span className="font-body text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-charcoal/60 bg-white/75 backdrop-blur-sm px-2.5 py-1.5">
                      {category}
                    </span>
                  </div>

                  {/* Dark overlay on hover */}
                  <div className="absolute inset-0 bg-charcoal/0 transition-colors duration-500 group-hover:bg-charcoal/55 z-10" />

                  {/* Info overlay — slides up on hover */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-full p-6 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-y-0 z-20">
                    <p className="font-body text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-accent mb-1.5">
                      {category}
                    </p>
                    <h3 className="font-heading text-lg font-bold text-bone leading-snug">
                      {title}
                    </h3>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute start-0 bottom-0 h-px w-0 bg-accent transition-all duration-700 ease-[var(--ease-expo)] group-hover:w-full z-20" />
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {activeProject !== null && project && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeLightbox}
          >
            {/* Prev button */}
            <button
              onClick={(e) => { e.stopPropagation(); lang === "he" ? goNext() : goPrev(); }}
              className="absolute start-4 top-1/2 -translate-y-1/2 z-10 grid size-12 place-items-center text-white/40 hover:text-white transition-colors duration-300"
              aria-label={ui.prev}
            >
              <ChevronLeft size={30} />
            </button>

            {/* Next button */}
            <button
              onClick={(e) => { e.stopPropagation(); lang === "he" ? goPrev() : goNext(); }}
              className="absolute end-4 top-1/2 -translate-y-1/2 z-10 grid size-12 place-items-center text-white/40 hover:text-white transition-colors duration-300"
              aria-label={ui.next}
            >
              <ChevronRight size={30} />
            </button>

            {/* Image container — swipeable */}
            <motion.div
              className="relative"
              style={{ width: "min(88vw, 620px)", height: "min(78vh, 826px)" }}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_: unknown, info: PanInfo) => {
                if (info.offset.x < -60) lang === "he" ? goPrev() : goNext();
                if (info.offset.x > 60) lang === "he" ? goNext() : goPrev();
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Crossfade image on change */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={series[activeImage]}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Image
                    src={series[activeImage]}
                    alt={`${ut[`proj_${activeProject}_title`]} — ${activeImage + 1}`}
                    fill
                    sizes="(max-width: 620px) 88vw, 620px"
                    className="object-contain"
                    priority
                  />
                </motion.div>
              </AnimatePresence>

              {/* Caption */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-8 text-start pointer-events-none z-10">
                <p className="font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-accent mb-2">
                  {ut[`proj_${activeProject}_category`]}
                </p>
                <h3 className="font-heading text-xl md:text-2xl font-bold text-white">
                  {ut[`proj_${activeProject}_title`]}
                </h3>
              </div>

              {/* Frame border */}
              <div className="absolute inset-0 border border-white/[0.06] pointer-events-none z-10" />
            </motion.div>

            {/* Counter */}
            <p className="mt-5 font-body text-xs text-white/40 tracking-[0.15em] tabular-nums select-none pointer-events-none">
              {activeImage + 1} / {totalImages}
            </p>

            {/* Close button */}
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
