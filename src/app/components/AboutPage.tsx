"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowDownLeft } from "lucide-react";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ContactForm from "./ContactForm";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const { lang, dir } = useLang();
  const l = lang as "en" | "he";
  const c = useTranslations("about", l);
  const ct = c as Record<string, string>;
  const ArrowIcon = lang === "he" ? ArrowDownLeft : ArrowDownRight;
  const expertise = [
    { num: "01", title: ct.expertise_0_title, desc: ct.expertise_0_desc },
    { num: "02", title: ct.expertise_1_title, desc: ct.expertise_1_desc },
    { num: "03", title: ct.expertise_2_title, desc: ct.expertise_2_desc },
  ];
  const stats = [
    { value: c.stat1Value, label: c.stat1Label },
    { value: c.stat2Value, label: c.stat2Label },
    { value: c.stat3Value, label: c.stat3Label },
  ];

  return (
    <main className="relative" dir={dir}>
      <Navbar />

      {/* ── 1. HERO ────────────────────────────────────────────────────────── */}
      <section className="relative bg-charcoal overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="relative mx-auto max-w-[1440px] px-8">
          <FadeUp delay={0.05}>
            <p className="overline-label !text-warm-gray mb-8">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              {c.overline}
            </p>
          </FadeUp>

          <FadeUp delay={0.12}>
            <h1 className="font-heading text-4xl font-bold leading-[1.08] text-bone md:text-6xl lg:text-7xl max-w-3xl whitespace-pre-line">
              {c.hero}
            </h1>
          </FadeUp>

          <FadeUp delay={0.2} className="mt-8 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            {/* G1 Badge — visually distinct */}
            <div className="inline-flex items-center gap-3 border border-accent bg-accent/[0.06] px-5 py-3 self-start">
              <span className="font-heading text-2xl font-bold text-accent leading-none">
                {c.g1BadgeText}
              </span>
              <div className="h-6 w-px bg-accent/30" />
              <span className="font-body text-xs font-semibold tracking-[0.18em] uppercase text-accent/80">
                {c.g1Label}
              </span>
            </div>

            <p className="font-body text-base font-light text-bone/50 max-w-md leading-relaxed whitespace-pre-line">
              {c.heroSub}
            </p>
          </FadeUp>

          {/* Stats row */}
          <FadeUp delay={0.28} className="mt-10 grid grid-cols-3 max-w-lg gap-px bg-bone/[0.06]">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-charcoal px-6 py-5">
                <p className="font-heading text-3xl font-bold text-bone md:text-4xl">{stat.value}</p>
                <p className="mt-1 font-body text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-bone/35">
                  {stat.label}
                </p>
              </div>
            ))}
          </FadeUp>

          {/* CTA link */}
          <FadeUp delay={0.34} className="mt-14">
            <Link
              href={`/${lang}#portfolio`}
              className="group inline-flex items-center gap-3 font-body text-sm font-semibold tracking-wide text-bone/60 hover:text-bone transition-colors duration-300"
            >
              <span className="relative">
                {c.ctaLabel}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-[inline-start] scale-x-0 bg-accent transition-transform duration-300 ease-[var(--ease-expo)] group-hover:scale-x-100" />
              </span>
              <ArrowIcon size={16} className="transition-transform duration-300 group-hover:translate-y-1" />
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* ── 2. FOUNDER STORY ────────────────────────────────────────────────── */}
      <section className="bg-bone py-14 md:py-24 lg:py-32 overflow-hidden">
        <div className="mx-auto max-w-[1440px] px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-10 items-center">

            {/* Text column */}
            <div className="lg:col-span-6 xl:col-span-5 text-start">
              <FadeUp>
                <p className="overline-label mb-6">
                  <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
                  {c.founderOverline}
                </p>
              </FadeUp>

              <FadeUp delay={0.08}>
                <h2 className="font-heading text-3xl font-bold leading-snug text-charcoal md:text-4xl lg:text-5xl whitespace-pre-line">
                  {c.founderHeading}
                </h2>
              </FadeUp>

              <FadeUp delay={0.15}>
                <p className="mt-8 font-body text-base font-light leading-relaxed text-charcoal/55 md:text-lg max-w-lg whitespace-pre-line">
                  {c.founderBody}
                </p>
              </FadeUp>

              {/* Founder signature block */}
              <FadeUp delay={0.22}>
                <div className="mt-10 inline-flex items-center gap-5 border-t border-charcoal/10 pt-8">
                  <div className="h-10 w-px bg-accent" />
                  <div>
                    <p className="font-heading text-lg font-bold text-charcoal">{c.founderName}</p>
                    <p className="mt-0.5 font-body text-xs font-semibold tracking-[0.15em] uppercase text-charcoal/40">
                      {c.founderRole}
                    </p>
                  </div>
                </div>
              </FadeUp>
            </div>

            {/* Image column */}
            <motion.div
              className="lg:col-span-6 xl:col-span-7 relative aspect-[4/3] lg:aspect-[3/4] overflow-hidden"
              initial={{ opacity: 0, x: lang === "he" ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease }}
            >
              <Image
                src="/ramat-eshkol-penthouse-1.jpg"
                alt={c.founderName}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
                priority
              />
              {/* Subtle overlay so text above is always readable */}
              <div className="absolute inset-0 bg-charcoal/[0.04]" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Rule */}
      <div className="border-b border-warm-gray-light" />

      {/* ── 3. PHILOSOPHY / STANDARD ────────────────────────────────────────── */}
      <section className="bg-charcoal py-14 md:py-24 lg:py-32">
        <div className="mx-auto max-w-[1440px] px-8">
          <FadeUp>
            <p className="overline-label !text-warm-gray mb-10">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              {c.standardOverline}
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <blockquote className="relative max-w-4xl">
              {/* Decorative quote mark */}
              <span
                className="absolute -top-6 -start-4 font-heading font-bold text-accent/10 leading-none pointer-events-none select-none"
                aria-hidden="true"
                style={{ fontSize: "clamp(6rem, 14vw, 12rem)" }}
              >
                "
              </span>
              <p className="relative font-heading text-2xl font-bold leading-snug text-bone md:text-3xl lg:text-4xl">
                {c.standardQuote}
              </p>
            </blockquote>
          </FadeUp>
        </div>
      </section>

      {/* ── 4. EXPERTISE HIGHLIGHTS ─────────────────────────────────────────── */}
      <section className="bg-bone py-14 md:py-24 lg:py-32">
        <div className="mx-auto max-w-[1440px] px-8 text-start">
          <div className="mb-10 md:mb-16">
            <FadeUp>
              <p className="overline-label mb-6">
                <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
                {c.expertiseOverline}
              </p>
            </FadeUp>
            <FadeUp delay={0.08}>
              <h2 className="font-heading text-3xl font-bold leading-snug text-charcoal md:text-4xl lg:text-5xl whitespace-pre-line max-w-lg">
                {c.expertiseHeading}
              </h2>
            </FadeUp>
          </div>

          <div className="grid grid-cols-1 gap-px bg-charcoal/[0.07] md:grid-cols-3">
            {expertise.map((item, i) => (
              <motion.div
                key={item.num}
                className="group bg-bone p-10 transition-colors duration-500 hover:bg-charcoal md:p-14 text-start"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
              >
                <h3 className="font-heading text-xl font-bold text-charcoal transition-colors duration-500 group-hover:text-bone md:text-2xl whitespace-pre-line">
                  {item.title}
                </h3>
                <p className="mt-4 font-body text-sm font-light leading-relaxed text-charcoal/55 transition-colors duration-500 group-hover:text-bone/55 whitespace-pre-line">
                  {item.desc}
                </p>
                <div className="mt-8 h-px w-12 bg-accent/30 transition-all duration-500 group-hover:w-20 group-hover:bg-accent" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ContactForm />
      <Footer />
    </main>
  );
}
