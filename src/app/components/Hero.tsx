"use client";
 
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowDownLeft } from "lucide-react";
import { useRef } from "react";
import { useLang } from "./LangContext";
 
/* ── Per-language copy ── */
const copy = {
  he: {
    overline: "בנין איתן",
    heading: "בונים עתיד.",
    sub: "משלבים מומחיות של 25 שנה עם דיוק ואיכות ללא פשרות.",
    cta: "גלה את הפרויקטים",
    imageAlt: "גימור פנים יוקרתי",
    stat1: { value: "25+", label: "שנות ניסיון" },
    stat2: { value: "150+", label: "פרויקטים שהושלמו" },
  },
  en: {
    overline: "Binyan Eitan",
    heading: "Building\nLegacies,\nEngineering\nPrecision.",
    sub: "Engineering & Luxury Construction — An Uncompromising Standard of Excellence",
    cta: "Explore Projects",
    imageAlt: "Luxury interior finish",
    stat1: { value: "25+", label: "Years of Experience" },
    stat2: { value: "150+", label: "Projects Completed" },
  },
} as const;
 
/* ── Animation constants ── */
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
 
const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};
 
const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay, ease },
  },
});
 
const fadeScale = {
  hidden: { opacity: 0, scale: 1.06 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.4, delay: 0.15, ease },
  },
};
 
/* ═════════════════════════════════════════════════════════
   HERO SECTION
   12-column asymmetric grid with layered depth overlap
   ═════════════════════════════════════════════════════════ */
export default function Hero() {
  const { lang } = useLang();
  const { overline, heading, sub, cta, imageAlt, stat1, stat2 } = copy[lang];
  const Arrow = lang === "he" ? ArrowDownLeft : ArrowDownRight;
 
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
 
  return (
    <section
      ref={sectionRef}
      className="relative min-h-svh overflow-hidden bg-bone"
    >
      {/* ── Architectural grid lines (decorative) ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Vertical accent line — start side */}
        <div className="absolute inset-y-0 start-[8.33%] w-px bg-charcoal/[0.03]" />
        {/* Vertical accent line — midpoint */}
        <div className="absolute inset-y-0 start-[41.66%] w-px bg-charcoal/[0.03] max-md:hidden" />
        {/* Vertical accent line — image boundary */}
        <div className="absolute inset-y-0 start-[58.33%] w-px bg-accent/[0.06] max-md:hidden" />
      </div>
 
      {/* ═══════════════════════════════════════════════
          MAIN 12-COLUMN GRID
          Text: cols 1–6 | Image: cols 5–12 (overlaps col 5-6)
          ═══════════════════════════════════════════════ */}
      <motion.div
        className="relative mx-auto grid min-h-svh max-w-[1400px] grid-cols-4 gap-x-4 px-6 pt-36 pb-24 md:grid-cols-12 md:gap-x-6 md:pt-44 md:pb-32 lg:px-12"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* ──────────────────────────────────────────────
            TEXT COLUMN — cols 1–6
            Sits on top of image via z-index for overlap
            ────────────────────────────────────────────── */}
        <div className="z-20 col-span-4 flex flex-col justify-center md:col-span-6 md:col-start-1 md:row-start-1">
          {/* Overline */}
          <motion.p
            className="overline-label mb-6 md:mb-8"
            variants={fadeUp()}
          >
            <span className="me-3 inline-block h-px w-8 bg-accent align-middle" />
            {overline}
          </motion.p>
 
          {/* ── Main Heading ── */}
          <motion.h1
            className="font-heading text-[clamp(3.25rem,8vw,8.5rem)] leading-[0.92] font-bold tracking-tight text-charcoal"
            variants={fadeUp(0.05)}
          >
            {heading.split("\n").map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </motion.h1>
 
          {/* ── Subline ── */}
          <motion.p
            className="mt-7 max-w-md font-body text-base leading-relaxed font-light text-charcoal/55 md:mt-9 md:text-lg"
            variants={fadeUp(0.15)}
          >
            {sub}
          </motion.p>
 
          {/* ── CTA ── */}
          <motion.a
            href={`/${lang}#projects`}
            className="group mt-10 inline-flex w-fit items-center gap-3 border-b-2 border-charcoal/80 pb-2.5 font-body text-sm font-semibold tracking-wider uppercase text-charcoal transition-all duration-500 hover:gap-4 hover:border-accent hover:text-accent md:mt-14"
            variants={fadeUp(0.25)}
          >
            {cta}
            <Arrow
              size={18}
              strokeWidth={2}
              className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-y-0.5"
            />
          </motion.a>
 
          {/* ── Stats Row ── */}
          <motion.div
            className="mt-14 flex gap-12 border-t border-charcoal/[0.07] pt-8 md:mt-20 md:gap-16"
            variants={fadeUp(0.35)}
          >
            <div>
              <span className="block font-heading text-3xl font-bold text-charcoal md:text-4xl">
                {stat1.value}
              </span>
              <span className="mt-1 block font-body text-xs font-medium tracking-wider uppercase text-warm-gray">
                {stat1.label}
              </span>
            </div>
            <div>
              <span className="block font-heading text-3xl font-bold text-charcoal md:text-4xl">
                {stat2.value}
              </span>
              <span className="mt-1 block font-body text-xs font-medium tracking-wider uppercase text-warm-gray">
                {stat2.label}
              </span>
            </div>
          </motion.div>
        </div>
 
        {/* ──────────────────────────────────────────────
            IMAGE COLUMN — cols 5–12
            Starts at col 5 to deliberately overlap cols 5-6
            with the text block, creating layered depth
            ────────────────────────────────────────────── */}
        <motion.div
          className="relative col-span-4 mt-12 self-center md:col-span-8 md:col-start-5 md:row-start-1 md:mt-0"
          variants={fadeScale}
        >
          {/* Decorative offset frame — gold accent */}
          <div
            className="absolute -end-3 -bottom-3 z-0 h-full w-full border border-accent/15 md:-end-6 md:-bottom-6"
            aria-hidden="true"
          />
 
          {/* Secondary micro-frame — architectural detail */}
          <div
            className="absolute -end-1.5 -bottom-1.5 z-0 h-full w-full border border-charcoal/[0.04] md:-end-3 md:-bottom-3"
            aria-hidden="true"
          />
 
          {/* Image container with parallax */}
          <motion.div
            className="relative z-10 aspect-[4/5] w-full overflow-hidden md:aspect-[3/4] lg:aspect-[4/5]"
            style={{ y: imageY }}
          >
            <Image
              src="/luxury-interior.jpg"
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 66vw"
              priority
            />
 
            {/* Gradient veil — ensures heading legibility in overlap zone */}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bone via-bone/60 via-35% to-transparent md:from-bone/90 md:via-bone/40 md:via-40% md:to-transparent"
              aria-hidden="true"
            />
 
            {/* Bottom vignette for mobile stacking */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bone/50 to-transparent md:hidden"
              aria-hidden="true"
            />
          </motion.div>
 
          {/* ── Floating label on image (architectural detail) ── */}
          <motion.div
            className="absolute -bottom-5 end-8 z-20 hidden bg-bone px-5 py-3 shadow-sm md:block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.7, ease }}
          >
            <p className="font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-warm-gray">
              {lang === "he" ? "גימור פנים יוקרתי" : "Luxury Interior Finish"}
            </p>
          </motion.div>
        </motion.div>
 
        {/* ──────────────────────────────────────────────
            SCROLL INDICATOR — bottom center
            ────────────────────────────────────────────── */}
        <motion.div
          className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          <span className="font-body text-[0.6rem] font-medium tracking-[0.3em] uppercase text-warm-gray">
            {lang === "he" ? "גלול" : "Scroll"}
          </span>
          <motion.div
            className="h-10 w-px bg-charcoal/15 origin-top"
            animate={{ scaleY: [0, 1, 0] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
