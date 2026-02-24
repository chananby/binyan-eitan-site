"use client";
 
import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "./LangContext";
 
/* ── Hotspot data ── */
interface Hotspot {
  id: string;
  x: number; // percentage from start
  y: number; // percentage from top
  he: string;
  en: string;
  labelHe: string;
  labelEn: string;
}
 
const hotspots: Hotspot[] = [
  {
    id: "electrical",
    x: 22,
    y: 35,
    labelHe: "מערכות חשמל",
    labelEn: "Electrical Systems",
    he: "ככה נראה השקט הנפשי שלכם ב-50 השנים הקרובות.",
    en: "This is what your peace of mind looks like for the next 50 years.",
  },
  {
    id: "heating",
    x: 55,
    y: 72,
    labelHe: "חימום תת-רצפתי",
    labelEn: "Underfloor Heating",
    he: "מי אמר שאי אפשר ללכת יחפים בחורף הירושלמי?",
    en: "Who said you can't walk barefoot during a Jerusalem winter?",
  },
  {
    id: "structure",
    x: 80,
    y: 28,
    labelHe: "מבנה ונוף",
    labelEn: "Structure & View",
    he: "אנחנו בונים את המסגרת, הנוף כבר עושה את השאר.",
    en: "We build the frame. The view does the rest.",
  },
];
 
const copy = {
  he: {
    overline: "אנטומיה טכנית",
    heading: "מה שנמצא\nמאחורי הקירות",
    sub: "כל פרט הנדסי מתוכנן בקפידה — מהתשתיות הנסתרות ועד לגימור הסופי.",
  },
  en: {
    overline: "Technical Anatomy",
    heading: "What Lives\nBehind the Walls",
    sub: "Every engineering detail is meticulously planned — from hidden infrastructure to final finishes.",
  },
} as const;
 
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
 
/* ═════════════════════════════════════════════════════════
   TECHNICAL ANATOMY SECTION
   Interactive blueprint-style hotspot exploration
   ═════════════════════════════════════════════════════════ */
export default function TechnicalAnatomy() {
  const { lang } = useLang();
  const { overline, heading, sub } = copy[lang];
  const [active, setActive] = useState<string | null>(null);
 
  return (
    <section className="relative bg-bone py-28 md:py-36">
      {/* ── Architectural grid lines ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-y-0 start-[8.33%] w-px bg-charcoal/[0.03]" />
        <div className="absolute inset-y-0 end-[8.33%] w-px bg-charcoal/[0.03]" />
      </div>
 
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* ── Section header — 12-col editorial layout ── */}
        <div className="mb-16 grid grid-cols-4 gap-x-4 md:mb-24 md:grid-cols-12 md:gap-x-6">
          <div className="col-span-4 md:col-span-3 md:col-start-1">
            <p className="overline-label">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              {overline}
            </p>
          </div>
          <div className="col-span-4 mt-6 md:col-span-7 md:col-start-4 md:mt-0">
            <h2 className="font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
              {heading.split("\n").map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="mt-5 max-w-xl font-body text-base leading-relaxed font-light text-charcoal/55 md:mt-7 md:text-lg">
              {sub}
            </p>
          </div>
        </div>
 
        {/* ── Interactive image with hotspots ── */}
        <div className="relative">
          {/* Decorative offset frame */}
          <div
            className="absolute -end-3 -bottom-3 z-0 h-full w-full border border-accent/10 md:-end-5 md:-bottom-5"
            aria-hidden="true"
          />
 
          <div className="relative z-10 aspect-[16/10] w-full overflow-hidden md:aspect-[16/9]">
            <Image
              src="/advanced-underfloor-heating-israel.jpg"
              alt={lang === "he" ? "תשתיות הנדסיות מתקדמות" : "Advanced engineering infrastructure"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 90vw"
            />
 
            {/* Subtle dark overlay for hotspot contrast */}
            <div
              className="pointer-events-none absolute inset-0 bg-charcoal/20"
              aria-hidden="true"
            />
 
            {/* ── Hotspots ── */}
            {hotspots.map((spot) => {
              const isActive = active === spot.id;
              return (
                <div
                  key={spot.id}
                  className="absolute z-20"
                  style={{
                    top: `${spot.y}%`,
                    insetInlineStart: `${spot.x}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {/* Pulse ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border border-bone/40"
                    animate={{
                      scale: [1, 2.2],
                      opacity: [0.6, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    style={{ width: 20, height: 20, margin: "auto", inset: 0 }}
                  />
 
                  {/* Hotspot button */}
                  <button
                    onClick={() => setActive(isActive ? null : spot.id)}
                    onMouseEnter={() => setActive(spot.id)}
                    className={`relative flex size-5 items-center justify-center rounded-full transition-all duration-500 ${
                      isActive
                        ? "scale-125 bg-accent shadow-lg shadow-accent/30"
                        : "bg-bone/90 hover:bg-accent hover:scale-110"
                    }`}
                    aria-label={lang === "he" ? spot.labelHe : spot.labelEn}
                  >
                    <span
                      className={`block size-1.5 rounded-full transition-colors duration-300 ${
                        isActive ? "bg-bone" : "bg-charcoal/60"
                      }`}
                    />
                  </button>
 
                  {/* ── Tooltip chip ── */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.35, ease }}
                        className="absolute start-1/2 top-full z-30 mt-3 w-64 -translate-x-1/2 sm:w-72"
                        /* Keep logical: start-1/2 works for both directions */
                        style={{ transform: "translateX(-50%)" }}
                      >
                        {/* Chip arrow */}
                        <div
                          className="absolute -top-1.5 start-1/2 size-3 -translate-x-1/2 rotate-45 bg-charcoal"
                          style={{ transform: "translateX(-50%) rotate(45deg)" }}
                          aria-hidden="true"
                        />
 
                        <div className="relative overflow-hidden bg-charcoal px-5 py-4 shadow-xl">
                          {/* Label */}
                          <p className="mb-2 font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-accent">
                            {lang === "he" ? spot.labelHe : spot.labelEn}
                          </p>
                          {/* Quote */}
                          <p className="font-body text-sm leading-relaxed font-light text-bone/90">
                            &ldquo;{lang === "he" ? spot.he : spot.en}&rdquo;
                          </p>
                          {/* Accent bar */}
                          <div className="mt-3 h-px w-8 bg-accent/40" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
 
          {/* ── Legend bar beneath image ── */}
          <div className="mt-6 flex flex-wrap items-center gap-6 md:mt-8 md:gap-10">
            {hotspots.map((spot) => (
              <button
                key={spot.id}
                onClick={() => setActive(active === spot.id ? null : spot.id)}
                className={`group flex items-center gap-2.5 transition-colors duration-300 ${
                  active === spot.id ? "text-charcoal" : "text-charcoal/40 hover:text-charcoal/70"
                }`}
              >
                <span
                  className={`block size-2 rounded-full transition-colors duration-300 ${
                    active === spot.id ? "bg-accent" : "bg-warm-gray group-hover:bg-accent/50"
                  }`}
                />
                <span className="font-body text-xs font-medium tracking-wider uppercase">
                  {lang === "he" ? spot.labelHe : spot.labelEn}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
