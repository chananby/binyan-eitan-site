"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useLang } from "./LangContext";
import { useLightboxHistory } from "../hooks/useLightboxHistory";
import type { GalleryByCategory, GalleryImage } from "../api/gallery/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "before-after" → "Before After"  |  "kitchen" → "Kitchen" */
function formatCategory(raw: string): string {
  return raw
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PortfolioPhotoGallery() {
  const { lang } = useLang();
  const isRtl = lang === "he";

  // ── Data fetching ──────────────────────────────────────────────────────────
  const [data, setData]       = useState<GalleryByCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<GalleryByCategory>;
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Lightbox state ─────────────────────────────────────────────────────────
  // allImages is a flat list built from all categories in display order,
  // so prev/next navigation works seamlessly across category boundaries.
  const allImages: GalleryImage[] = data
    ? Object.values(data).flat()
    : [];

  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setActiveIdx(null), []);

  const goPrev = useCallback(() => {
    setActiveIdx((i) =>
      i !== null ? (i - 1 + allImages.length) % allImages.length : 0
    );
  }, [allImages.length]);

  const goNext = useCallback(() => {
    setActiveIdx((i) =>
      i !== null ? (i + 1) % allImages.length : 0
    );
  }, [allImages.length]);

  // Keyboard navigation
  useEffect(() => {
    if (activeIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")     closeLightbox();
      if (e.key === "ArrowLeft")  isRtl ? goNext() : goPrev();
      if (e.key === "ArrowRight") isRtl ? goPrev() : goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIdx, closeLightbox, goPrev, goNext, isRtl]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = activeIdx !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeIdx]);

  // Hardware back-button / swipe-back on mobile
  useLightboxHistory(activeIdx !== null, closeLightbox);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <section className="bg-bone py-24" dir={isRtl ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-[1440px] px-8 flex items-center justify-center gap-3 text-charcoal/30">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-body text-sm">{isRtl ? "טוען תמונות…" : "Loading images…"}</span>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="bg-bone py-24" dir={isRtl ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-[1440px] px-8 text-center">
          <p className="font-body text-sm text-charcoal/40">
            {isRtl ? "לא ניתן לטעון את הגלריה כרגע." : "Gallery unavailable at the moment."}
          </p>
        </div>
      </section>
    );
  }

  const categories = Object.keys(data);
  if (categories.length === 0) return null;

  // Build a flat index map: category → start index in allImages[]
  let globalOffset = 0;
  const categoryOffsets: Record<string, number> = {};
  for (const cat of categories) {
    categoryOffsets[cat] = globalOffset;
    globalOffset += data[cat].length;
  }

  return (
    <>
      <section
        className="bg-bone py-16 md:py-24"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="mx-auto max-w-[1440px] px-8 space-y-16 md:space-y-24">

          {categories.map((cat) => {
            const images = data[cat];
            const offset = categoryOffsets[cat];

            return (
              <div key={cat}>
                {/* Category header */}
                <div className="mb-8 flex items-center gap-4 border-b border-warm-gray-light pb-4">
                  <span className="inline-block h-px w-6 bg-accent flex-shrink-0" />
                  <h2 className="font-heading text-xl font-bold text-charcoal md:text-2xl">
                    {formatCategory(cat)}
                  </h2>
                  <span className="font-body text-xs text-charcoal/30 ms-auto">
                    {images.length}
                  </span>
                </div>

                {/* Photo grid */}
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((img, localIdx) => {
                    const globalIdx = offset + localIdx;
                    return (
                      <motion.button
                        key={img.publicId}
                        onClick={() => setActiveIdx(globalIdx)}
                        className="group relative aspect-square w-full overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-30px" }}
                        transition={{
                          duration: 0.45,
                          delay: (localIdx % 4) * 0.06,
                          ease,
                        }}
                        aria-label={`${formatCategory(cat)} — ${img.action} ${img.num}`}
                      >
                        <Image
                          src={img.thumb}
                          alt={`${formatCategory(cat)} ${img.action} ${img.num}`}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-charcoal/0 transition-colors duration-500 md:group-hover:bg-charcoal/50" />

                        {/* Hover label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 transition-opacity duration-500 md:group-hover:opacity-100">
                          <div className="h-px w-6 bg-accent" />
                          <span className="font-body text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-bone">
                            {img.action} {img.num}
                          </span>
                        </div>

                        {/* Bottom accent bar */}
                        <div className="absolute bottom-0 start-0 h-px w-0 bg-accent transition-all duration-700 ease-out group-hover:w-full" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}

        </div>
      </section>

      {/* ── Lightbox ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeIdx !== null && allImages[activeIdx] && (
          <motion.div
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeLightbox}
          >
            {/* Prev */}
            <button
              onClick={(e) => { e.stopPropagation(); isRtl ? goNext() : goPrev(); }}
              className="absolute start-3 top-1/2 z-10 -translate-y-1/2 grid size-12 place-items-center text-white/40 hover:text-white transition-colors duration-300 md:start-6"
              aria-label={isRtl ? "הבא" : "Previous"}
            >
              <ChevronLeft size={28} />
            </button>

            {/* Next */}
            <button
              onClick={(e) => { e.stopPropagation(); isRtl ? goPrev() : goNext(); }}
              className="absolute end-3 top-1/2 z-10 -translate-y-1/2 grid size-12 place-items-center text-white/40 hover:text-white transition-colors duration-300 md:end-6"
              aria-label={isRtl ? "הקודם" : "Next"}
            >
              <ChevronRight size={28} />
            </button>

            {/* Image — swipeable */}
            <motion.div
              className="relative"
              style={{ width: "min(90vw, 960px)", height: "min(80vh, 720px)" }}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.28, ease }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_: unknown, info: PanInfo) => {
                if (info.offset.x < -60) isRtl ? goPrev() : goNext();
                if (info.offset.x > 60)  isRtl ? goNext() : goPrev();
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Crossfade on image change */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={allImages[activeIdx].publicId}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Image
                    src={allImages[activeIdx].url}
                    alt={`${allImages[activeIdx].action} ${allImages[activeIdx].num}`}
                    fill
                    sizes="(max-width: 960px) 90vw, 960px"
                    className="object-contain"
                    priority
                  />
                </motion.div>
              </AnimatePresence>

              {/* Caption */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-5 pointer-events-none z-10 text-start">
                <p className="font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-accent mb-1">
                  {formatCategory(
                    // Recover the category for the active image
                    (() => {
                      let cumulative = 0;
                      for (const cat of categories) {
                        cumulative += data[cat].length;
                        if (activeIdx < cumulative) return cat;
                      }
                      return "";
                    })()
                  )}
                </p>
                <p className="font-body text-sm font-semibold tracking-wide text-white">
                  {allImages[activeIdx].action} — {allImages[activeIdx].num}
                </p>
              </div>

              {/* Frame */}
              <div className="absolute inset-0 border border-white/[0.06] pointer-events-none z-10" />
            </motion.div>

            {/* Counter */}
            <p className="mt-4 font-body text-xs text-white/30 tracking-[0.15em] tabular-nums select-none pointer-events-none">
              {activeIdx + 1} / {allImages.length}
            </p>

            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 end-4 grid size-12 place-items-center border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors duration-300"
              aria-label={isRtl ? "סגור" : "Close"}
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
