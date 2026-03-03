"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowDownLeft } from "lucide-react";
import { useRef } from "react";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";

type Lang = "en" | "he";

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
   HERO SECTION — High-Contrast Engineering Palette
   Deep charcoal background · Crisp bone text · Precision grid
   ═════════════════════════════════════════════════════════ */
export default function Hero() {
  const { lang } = useLang() as { lang: Lang };
  const t = useTranslations("hero", lang);
  const { overline, heading, sub, g1Label, cta, imageAlt, imageFloatLabel, scroll } = t;
  const imageUrl = (t.imageUrl as string) || "/luxury-interior.jpg";
  const stat1 = { value: t.stat1Value, label: t.stat1Label };
  const stat2 = { value: t.stat2Value, label: t.stat2Label };
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
      className="relative min-h-svh overflow-hidden bg-charcoal"
    >
      {/* ── Precision grid lines (visible on dark) ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-y-0 start-[8.33%] w-px bg-bone/[0.05]" />
        <div className="absolute inset-y-0 start-[41.66%] w-px bg-bone/[0.05] max-md:hidden" />
        <div className="absolute inset-y-0 start-[58.33%] w-px bg-accent/[0.12] max-md:hidden" />
        {/* horizontal hairline at top to signal structure */}
        <div className="absolute inset-x-0 top-[72px] h-px bg-bone/[0.06] md:top-[88px]" />
      </div>

      {/* ═══════════════════════════════════════════════
          MAIN 12-COLUMN GRID
          Text: cols 1–6 | Image: cols 5–12
          ═══════════════════════════════════════════════ */}
      <motion.div
        className="relative mx-auto grid min-h-svh max-w-[1440px] grid-cols-4 gap-x-4 px-8 pt-20 pb-12 md:grid-cols-12 md:gap-x-6 md:pt-28 md:pb-16"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* ──────────────────────────────────────────────
            TEXT COLUMN — cols 1–6
            Text sits directly on the dark charcoal bg.
            ────────────────────────────────────────────── */}
        <div className="z-20 col-span-4 flex flex-col justify-center md:col-span-6 md:col-start-1 md:row-start-1">
          <div className="relative max-w-[560px]">

            {/* Accent corner lines — engineering detail */}
            <span className="pointer-events-none absolute top-0 start-0 h-14 w-px bg-accent" aria-hidden="true" />
            <span className="pointer-events-none absolute top-0 start-0 h-px w-14 bg-accent" aria-hidden="true" />

            {/* Overline */}
            <motion.p
              className="overline-label mb-6 text-bone/50 md:mb-8"
              variants={fadeUp()}
            >
              <span className="me-3 inline-block h-px w-8 bg-accent align-middle" />
              {overline}
            </motion.p>

            {/* ── Main Heading — Extra Bold, commands attention ── */}
            <motion.h1
              className="font-heading text-[clamp(2.6rem,5vw,5.6rem)] leading-[1.25] font-extrabold tracking-tight text-bone"
              variants={fadeUp(0.05)}
            >
              {heading.split("\n").map((line: string, i: number) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </motion.h1>

            {/* ── Subline — full-opacity white, 20% larger ── */}
            <motion.p
              className="mt-8 max-w-sm font-body text-base leading-relaxed font-normal text-bone md:mt-10 md:text-[1.05rem]"
              variants={fadeUp(0.15)}
            >
              {sub}
            </motion.p>

            {/* ── G1 Certification Badge ── */}
            <motion.div className="mt-6 md:mt-7" variants={fadeUp(0.2)}>
              <span className="inline-flex items-center gap-2.5 border border-accent bg-accent/[0.12] px-4 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                <span className="font-body text-[0.65rem] font-semibold tracking-[0.22em] uppercase text-accent">
                  {g1Label}
                </span>
              </span>
            </motion.div>

            {/* ── CTA ── */}
            <motion.div className="mt-8 md:mt-10" variants={fadeUp(0.25)}>
              <Link
                href={`/${lang}#contact`}
                className="group inline-flex w-fit items-center gap-3 border-b-2 border-bone/50 pb-2.5 font-body text-sm font-semibold tracking-wider uppercase text-bone transition-all duration-500 hover:gap-4 hover:border-accent hover:text-accent"
              >
                {cta}
                <Arrow
                  size={18}
                  strokeWidth={2}
                  className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-y-0.5"
                />
              </Link>
            </motion.div>

            {/* ── Performance Grid (Stats) ── */}
            <motion.div
              className="mt-10 border border-bone/15 md:mt-14"
              variants={fadeUp(0.35)}
            >
              <div className="grid grid-cols-2">
                {/* Stat 1 */}
                <div className="px-6 py-5 border-e border-bone/15">
                  <span className="block font-heading text-3xl font-extrabold text-bone md:text-[2.6rem] leading-none">
                    {stat1.value}
                  </span>
                  <span className="mt-2 block font-body text-[0.6rem] font-semibold tracking-[0.22em] uppercase text-bone/40">
                    {stat1.label}
                  </span>
                </div>
                {/* Stat 2 */}
                <div className="px-6 py-5">
                  <span className="block font-heading text-3xl font-extrabold text-bone md:text-[2.6rem] leading-none">
                    {stat2.value}
                  </span>
                  <span className="mt-2 block font-body text-[0.6rem] font-semibold tracking-[0.22em] uppercase text-bone/40">
                    {stat2.label}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────
            IMAGE COLUMN — cols 5–12
            Dark gradient overlay to frame the engineering
            ────────────────────────────────────────────── */}
        <motion.div
          className="relative col-span-4 mt-12 self-center md:col-span-8 md:col-start-5 md:row-start-1 md:mt-0"
          variants={fadeScale}
        >
          {/* Offset frame — accent, more visible on dark */}
          <div
            className="absolute -end-3 -bottom-3 z-0 h-full w-full border border-accent/30 md:-end-6 md:-bottom-6"
            aria-hidden="true"
          />
          {/* Secondary micro-frame */}
          <div
            className="absolute -end-1.5 -bottom-1.5 z-0 h-full w-full border border-bone/10 md:-end-3 md:-bottom-3"
            aria-hidden="true"
          />

          {/* Image container with parallax */}
          <motion.div
            className="relative z-10 aspect-[4/5] w-full overflow-hidden md:aspect-[3/4] lg:aspect-[4/5]"
            style={{ y: imageY }}
          >
            <Image
              src={imageUrl}
              alt={imageAlt as string}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 66vw"
              priority
            />

            {/* Dark gradient — frames the precision of the work */}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-charcoal/70 via-charcoal/20 via-40% to-transparent"
              aria-hidden="true"
            />

            {/* Bottom vignette for mobile stacking */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-charcoal/80 to-transparent md:hidden"
              aria-hidden="true"
            />

            {/* Top edge line — engineering precision mark */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-accent/40"
              aria-hidden="true"
            />
          </motion.div>

          {/* ── Floating label on image ── */}
          <motion.div
            className="absolute -bottom-5 end-8 z-20 hidden border border-bone/15 bg-charcoal px-5 py-3 shadow-lg md:block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.7, ease }}
          >
            <p className="font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-bone/50">
              {imageFloatLabel as string}
            </p>
          </motion.div>
        </motion.div>

        {/* ── Scroll indicator ── */}
        <motion.div
          className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          <span className="font-body text-[0.6rem] font-medium tracking-[0.3em] uppercase text-bone/30">
            {scroll as string}
          </span>
          <motion.div
            className="h-10 w-px bg-bone/20 origin-top"
            animate={{ scaleY: [0, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
