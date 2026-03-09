"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "./LangContext";

type Lang = "en" | "he";

/* ── Hotspot data (הטקסטים ההנדסיים החדשים) ── */
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
    labelHe: "תשתיות מערכות חכמות",
    labelEn: "Smart Infrastructure",
    he: "תכנון מוקפד של מערכות חשמל ותקשורת, המבטיח שקט נפשי ואפס תקלות לעשורים קדימה.",
    en: "Meticulous planning of electrical and communication systems, ensuring peace of mind and zero faults for decades.",
  },
  {
    id: "heating",
    x: 55,
    y: 72,
    labelHe: "בקרת אקלים ובידוד",
    labelEn: "Climate Control & Insulation",
    he: "מערכות חימום תת-רצפתי ובידוד תרמי ואקוסטי בסטנדרט המחמיר ביותר לאיכות חיים מקסימלית.",
    en: "Underfloor heating and thermal/acoustic insulation to the strictest standards for maximum quality of life.",
  },
  {
    id: "structure",
    x: 80,
    y: 28,
    labelHe: "קונסטרוקציה ושלד",
    labelEn: "Structural Framework",
    he: "יציקות מדויקות על המילימטר ושימוש בחומרי גלם פרימיום לבניית שלד עמיד ואיתן לדורות.",
    en: "Millimeter-precise casting and premium raw materials to build a robust framework that lasts for generations.",
  },
];

const copy = {
  he: {
    overline: "לב הבניין",
    heading: "האיכות שמתחת לפני השטח",
    sub: "אנו מקדישים לתהליכי הביצוע והשלד את אותה רמת דיוק שאנו מעניקים לגימורים הגלויים. כי בית איכותי נמדד בראש ובראשונה ביסודות שלו.",
  },
  en: {
    overline: "Technical Anatomy",
    heading: "Engineering Beyond the Surface",
    sub: "We build what is hidden from the eye with the same level of care as the visible finishes. That's the difference between a house that looks good and one built to last for generations.",
  },
} as const;

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ═════════════════════════════════════════════════════════
   TECHNICAL ANATOMY SECTION (הגרסה העשירה והמקצועית)
   ═════════════════════════════════════════════════════════ */
export default function TechnicalAnatomy() {
  const { lang } = useLang() as { lang: Lang };
  const { overline, heading, sub } = copy[lang];
  const [active, setActive] = useState<string | null>(null);

  return (
    <section className="relative bg-bone py-14 md:py-18 text-start">
      {/* ── Architectural grid lines ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-y-0 start-[8.33%] w-px bg-charcoal/[0.03]" />
        <div className="absolute inset-y-0 end-[8.33%] w-px bg-charcoal/[0.03]" />
      </div>

      <div className="mx-auto max-w-[1440px] px-8">
        {/* ── Section header ── */}
        <div className="mb-10 grid grid-cols-4 gap-x-4 md:mb-14 md:grid-cols-12 md:gap-x-6">
          <div className="col-span-4 md:col-span-3 md:col-start-1">
            <p className="overline-label">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              {overline}
            </p>
          </div>
          <div className="col-span-4 mt-6 md:col-span-7 md:col-start-4 md:mt-0">
            <h2 className="font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
              {heading}
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
              src="/amshinov-20.jpg"
              alt={lang === "he" ? "תשתיות הנדסיות מתקדמות" : "Advanced engineering infrastructure"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 90vw"
            />

            {/* Subtle dark overlay for hotspot contrast */}
            <div
              className="pointer-events-none absolute inset-0 bg-charcoal/20 transition-colors duration-500"
              aria-hidden="true"
            />

            {/* ── Hotspots ── */}
            {hotspots.map((spot: Hotspot) => {
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
                  {/* Pulse ring (האנימציה המנצנצת) */}
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

                  {/* ── Tooltip chip (חלון המידע שמרחף) ── */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.35, ease }}
                        className="absolute start-1/2 top-full z-30 mt-3 w-64 -translate-x-1/2 sm:w-72"
                        style={{ transform: "translateX(-50%)" }}
                      >
                        {/* Chip arrow */}
                        <div
                          className="absolute -top-1.5 start-1/2 size-3 -translate-x-1/2 rotate-45 bg-charcoal"
                          style={{ transform: "translateX(-50%) rotate(45deg)" }}
                          aria-hidden="true"
                        />

                        <div className="relative overflow-hidden bg-charcoal px-5 py-4 shadow-xl text-start">
                          {/* Label */}
                          <p className="mb-2 font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-accent">
                            {lang === "he" ? spot.labelHe : spot.labelEn}
                          </p>
                          {/* Quote / Details */}
                          <p className="font-body text-sm leading-relaxed font-light text-bone/90">
                            {lang === "he" ? spot.he : spot.en}
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
