"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowDownLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";
import { GoogleIcon, StarRating } from "./RatingIcons";

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
   HERO SECTION
   Light bone background · No floating box · Text integrated
   12-col asymmetric grid: text cols 1–6, image cols 5–12
   ═════════════════════════════════════════════════════════ */
export default function Hero() {
  const { lang } = useLang() as { lang: Lang };
  const t = useTranslations("hero", lang);
  const { overline, heading, sub, g1Label, cta, imageAlt, imageFloatLabel, scroll } = t;
  const imageUrl = (t.imageUrl as string) || "/luxury-interior.jpg";
  const stat1 = { value: t.stat1Value, label: t.stat1Label };
  const stat2 = { value: t.stat2Value, label: t.stat2Label };
  const stat3 = { value: t.stat3Value, label: t.stat3Label };
  // Above-the-fold social proof + response-time promise — numbers and copy
  // come from translations.json so localisation stays in one place and stays
  // in sync with the Testimonials section (rating) and ContactForm (promise).
  const googleRatingValue = t.googleRatingValue as string;
  const googleRatingCount = t.googleRatingCount as string;
  const googleRatingAria  = t.googleRatingAria  as string;
  const responseTime      = t.responseTime      as string;
  const Arrow = lang === "he" ? ArrowDownLeft : ArrowDownRight;

  const prefersReducedMotion = useReducedMotion();
  // Pause the scroll-indicator pulse while the tab is hidden — saves a few
  // animation frames on the background tab and is friendlier to battery.
  const [tabHidden, setTabHidden] = useState(false);
  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  // Parallax disabled when user opts out of motion (vestibular sensitivity).
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["0%", "12%"]
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-svh overflow-hidden bg-bone"
    >
      {/* ── Subtle architectural grid lines ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-y-0 start-[8.33%] w-px bg-charcoal/[0.03]" />
        <div className="absolute inset-y-0 start-[41.66%] w-px bg-charcoal/[0.03] max-md:hidden" />
        <div className="absolute inset-y-0 start-[58.33%] w-px bg-accent/[0.06] max-md:hidden" />
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
            Fully transparent — text sits on the bone bg.
            No box, no shadow, no border.
            ────────────────────────────────────────────── */}
        <div className="z-20 col-span-4 flex flex-col justify-center md:col-span-6 md:col-start-1 md:row-start-1">
          <div className="relative w-full">

            {/* Accent corner marks — subtle structural detail */}
            <span className="pointer-events-none absolute top-0 start-0 h-12 w-px bg-accent/60" aria-hidden="true" />
            <span className="pointer-events-none absolute top-0 start-0 h-px w-12 bg-accent/60" aria-hidden="true" />

            {/* Overline — kept narrow */}
            <motion.p
              className="overline-label mb-6 text-charcoal/70 md:mb-8 max-w-[520px]"
              variants={fadeUp()}
            >
              <span className="me-3 inline-block h-px w-8 bg-accent align-middle" />
              {overline}
            </motion.p>

            {/* Main Heading — contained within text column, no image overlap */}
            <motion.h1
              className="font-heading text-[clamp(2.2rem,4vw,4.6rem)] leading-[1.25] font-bold tracking-tight text-accent text-start text-balance md:pe-[34%]"
              variants={fadeUp(0.05)}
            >
              {heading.split("\n").map((line: string, i: number) => (
                <span key={i} className="block">{line}</span>
              ))}
            </motion.h1>

            {/* Sub-content constrained to 520px — sits cleanly in the bone zone */}
            <div className="max-w-[520px]">
              {/* ── Subline ── */}
              <motion.p
                className="mt-8 max-w-sm font-body text-base leading-relaxed font-normal text-charcoal/65 text-start md:mt-10 md:text-[1.05rem] whitespace-pre-line"
                variants={fadeUp(0.15)}
              >
                {sub}
              </motion.p>

              {/* ── Trust row: G1 badge + Google rating chip ──
                  Both surfaces are positioned at the same vertical to read as
                  a single "credentials" line. The chip is a quiet anchor
                  (white card, subtle border) so it doesn't compete with the
                  G1 mark, while still being clickable through to the full
                  testimonials section. */}
              <motion.div
                className="mt-6 md:mt-7 flex flex-wrap items-center gap-2.5"
                variants={fadeUp(0.2)}
              >
                <span className="inline-flex items-center gap-2.5 border border-accent/50 bg-accent/[0.04] px-4 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  <span className="font-body text-[0.65rem] font-semibold tracking-[0.22em] uppercase text-accent">
                    {g1Label}
                  </span>
                </span>

                <Link
                  href={`/${lang}#testimonials`}
                  aria-label={googleRatingAria}
                  className="inline-flex items-center gap-2 border border-warm-gray-light bg-white px-3 py-2 shadow-sm hover:border-accent/60 transition-colors duration-300"
                >
                  <GoogleIcon size={14} />
                  <StarRating rating={5} size={11} />
                  <span className="font-body text-[0.7rem] font-semibold text-charcoal leading-none">
                    {googleRatingValue}
                  </span>
                  <span className="hidden sm:inline-block h-3 w-px bg-warm-gray-light" aria-hidden="true" />
                  <span className="hidden sm:inline font-body text-[0.65rem] text-charcoal/70 leading-none">
                    {googleRatingCount}
                  </span>
                </Link>
              </motion.div>

              {/* ── CTA + response-time promise ──
                  Promise sits directly above the CTA so the visitor reads it
                  in the same eye-sweep that takes them to the action. Small
                  font, accent dot mark, mirrors the form's "תוך שעה" wording
                  for consistency. */}
              <motion.div className="mt-8 md:mt-10 flex flex-col items-start gap-3" variants={fadeUp(0.25)}>
                <span className="inline-flex items-center gap-2 font-body text-[0.7rem] text-charcoal/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  {responseTime}
                </span>
                <Link
                  href={`/${lang}#contact`}
                  className="group inline-flex w-fit items-center gap-3 border-b-2 border-charcoal/80 pb-2.5 font-body text-sm font-semibold tracking-wider uppercase text-charcoal transition-all duration-500 hover:gap-5 hover:border-accent hover:text-accent"
                >
                  {cta}
                  <Arrow
                    size={17}
                    strokeWidth={2.2}
                    className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-0.5 group-hover:translate-y-0.5"
                  />
                </Link>
              </motion.div>

              {/* ── Stats — precision grid with thin borders ── */}
              <motion.div
                className="mt-10 border border-charcoal/[0.08] md:mt-14"
                variants={fadeUp(0.35)}
              >
                <div className="grid grid-cols-3">
                  <div className="px-4 py-5 border-e border-charcoal/[0.08]">
                    <span className="block font-heading text-2xl font-extrabold text-charcoal leading-none md:text-[2rem]">
                      {stat1.value}
                    </span>
                    <span className="mt-2 block font-body text-[0.55rem] font-semibold tracking-[0.18em] uppercase text-charcoal/60">
                      {stat1.label}
                    </span>
                  </div>
                  <div className="px-4 py-5 border-e border-charcoal/[0.08]">
                    <span className="block font-heading text-2xl font-extrabold text-charcoal leading-none md:text-[2rem]">
                      {stat2.value}
                    </span>
                    <span className="mt-2 block font-body text-[0.55rem] font-semibold tracking-[0.18em] uppercase text-charcoal/60">
                      {stat2.label}
                    </span>
                  </div>
                  <div className="px-4 py-5">
                    <span className="block font-heading text-2xl font-extrabold text-charcoal leading-none md:text-[2rem]">
                      {stat3.value}
                    </span>
                    <span className="mt-2 block font-body text-[0.55rem] font-semibold tracking-[0.18em] uppercase text-charcoal/60">
                      {stat3.label}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────
            IMAGE COLUMN — cols 5–12
            Subtle bone gradient at the overlap edge so
            text remains legible without a box behind it.
            ────────────────────────────────────────────── */}
        <motion.div
          className="relative col-span-4 mt-12 self-center md:col-span-8 md:col-start-5 md:row-start-1 md:mt-0"
          variants={fadeScale}
        >
          {/* Image with parallax */}
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

            {/* Bone veil — fade at overlap edge for text legibility */}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-bone/[0.65] via-bone/[0.15] via-40% to-transparent"
              aria-hidden="true"
            />

            {/* Bottom vignette for mobile */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bone/50 to-transparent md:hidden"
              aria-hidden="true"
            />
          </motion.div>

          {/* Floating label */}
          <motion.div
            className="absolute -bottom-5 end-8 z-20 hidden bg-bone px-5 py-3 shadow-sm md:block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.7, ease }}
          >
            <p className="font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-charcoal/60">
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
          <span className="font-body text-[0.6rem] font-medium tracking-[0.3em] uppercase text-charcoal/35">
            {scroll as string}
          </span>
          <motion.div
            className="h-10 w-px bg-charcoal/15 origin-top"
            animate={(prefersReducedMotion || tabHidden) ? { scaleY: 1 } : { scaleY: [0, 1, 0] }}
            transition={(prefersReducedMotion || tabHidden) ? { duration: 0 } : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
