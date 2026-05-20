"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useLightboxHistory } from "../hooks/useLightboxHistory";
import type { GalleryImage } from "../../data/projects/types";

interface Props {
  images: GalleryImage[];
  projectTitle: string;
  lang: "he" | "en";
}

export default function ProjectGalleryClient({ images, projectTitle, lang }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const total = images.length;

  const altFor = useCallback(
    (img: GalleryImage, i: number) => {
      const specific = lang === "he" ? img.altHE : img.altEN;
      if (specific) return specific;
      return lang === "he"
        ? `${projectTitle} — תמונה ${i + 1}`
        : `${projectTitle} — image ${i + 1}`;
    },
    [lang, projectTitle]
  );

  const close = useCallback(() => setOpen(null), []);
  const goPrev = useCallback(() => setOpen((i) => (i === null ? 0 : (i - 1 + total) % total)), [total]);
  const goNext = useCallback(() => setOpen((i) => (i === null ? 0 : (i + 1) % total)), [total]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") lang === "he" ? goNext() : goPrev();
      if (e.key === "ArrowRight") lang === "he" ? goPrev() : goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lang, close, goPrev, goNext]);

  useEffect(() => {
    document.body.style.overflow = open !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useLightboxHistory(open !== null, close);

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (Math.abs(info.offset.x) < 50) return;
      if (info.offset.x > 0) lang === "he" ? goNext() : goPrev();
      else lang === "he" ? goPrev() : goNext();
    },
    [lang, goPrev, goNext]
  );

  return (
    <>
      {/* ── Thumbnail grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {images.map((image, i) => (
          <button
            key={image.src + i}
            onClick={() => setOpen(i)}
            className="relative aspect-[4/3] overflow-hidden bg-warm-gray/20 group cursor-pointer"
            aria-label={
              lang === "he"
                ? `פתח תמונה ${i + 1} — ${projectTitle}`
                : `Open image ${i + 1} — ${projectTitle}`
            }
          >
            <Image
              src={image.src}
              alt={altFor(image, i)}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/30 transition-colors duration-300" />
          </button>
        ))}
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open !== null && (
          <motion.div
            className="fixed inset-0 z-[9999] flex flex-col"
            style={{ backgroundColor: "rgba(45,41,38,0.97)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 md:px-8 py-4 shrink-0">
              <p className="text-bone/60 text-sm font-light">{projectTitle}</p>
              <div className="flex items-center gap-6">
                <span className="text-bone/40 text-sm font-light tabular-nums">
                  {open + 1} / {total}
                </span>
                <button
                  onClick={close}
                  className="text-bone/50 hover:text-bone transition-colors"
                  aria-label={lang === "he" ? "סגור" : "Close"}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Image area */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <button
                onClick={lang === "he" ? goNext : goPrev}
                className="absolute left-3 md:left-6 z-10 text-bone/30 hover:text-bone transition-colors p-3"
                aria-label={lang === "he" ? "הבא" : "Previous"}
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={lang === "he" ? goPrev : goNext}
                className="absolute right-3 md:right-6 z-10 text-bone/30 hover:text-bone transition-colors p-3"
                aria-label={lang === "he" ? "הקודם" : "Next"}
              >
                <ChevronRight size={32} />
              </button>

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
                      key={images[open].src}
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Image
                        src={images[open].src}
                        alt={altFor(images[open], open)}
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
            <div className="shrink-0 px-4 pb-4 pt-2" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-1.5 overflow-x-auto justify-center">
                {images.map((image, i) => (
                  <button
                    key={image.src + i}
                    onClick={() => setOpen(i)}
                    className={`shrink-0 w-12 h-9 relative overflow-hidden transition-opacity duration-200 ${
                      i === open ? "opacity-100 ring-1 ring-bone/60" : "opacity-30 hover:opacity-60"
                    }`}
                  >
                    <Image
                      src={image.src}
                      alt={`${projectTitle} — ${i + 1}`}
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
    </>
  );
}
