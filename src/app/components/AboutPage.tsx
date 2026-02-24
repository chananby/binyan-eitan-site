"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowDownLeft } from "lucide-react";
import { useLang } from "./LangContext";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ContactForm from "./ContactForm";

// ── Copy ──────────────────────────────────────────────────────────────────────

const copy = {
  en: {
    // Hero
    overline: "The Firm",
    hero: "Built on Trust\nand Precision.",
    heroSub: "Two decades of complex, luxury construction across Israel.",
    g1Label: "G1 Registered Contractor",
    ctaLabel: "Explore Portfolio",
    ctaHref: "/en#portfolio",

    // Founder
    founderOverline: "Our Founder",
    founderHeading: "A Legacy of\nHands-On Leadership.",
    founderBody:
      "For two decades, Binyan Eitan has led complex and prestigious projects across Israel. Moti Eitan, founder and owner, brings over 20 years of experience across key roles: from entrepreneurship and supervision to project management and on-site execution.",
    founderName: "Moti Eitan",
    founderRole: "Founder & Owner, Binyan Eitan",

    // Standard
    standardOverline: "Our Standard",
    standardQuote:
      "Trust and service are at the heart of everything we do — rooted in the understanding that a home is built, first and foremost, with people.",

    // Expertise
    expertiseOverline: "Expertise Highlights",
    expertiseHeading: "What Sets\nUs Apart.",
    expertise: [
      {
        num: "01",
        title: "Multidisciplinary\nExperience",
        desc: "From structural engineering and casting to luxury finishes and systems integration — handled in-house with absolute accountability at every stage.",
      },
      {
        num: "02",
        title: "Entrepreneurial\nVision",
        desc: "Each project is approached with an owner's mindset: timeline, budget, and quality are non-negotiable anchors that drive every decision.",
      },
      {
        num: "03",
        title: "Personal\nGuidance",
        desc: "Moti Eitan is personally involved at every critical phase, ensuring that every decision reflects the client's vision and our uncompromising standards.",
      },
    ],

    // Stats
    stat1: { value: "20+", label: "Years of Experience" },
    stat2: { value: "150+", label: "Projects Completed" },
    stat3: { value: "G1", label: "Registered Contractor" },
  },
  he: {
    // Hero
    overline: "המשרד",
    hero: "בונים על בסיס\nשל אמון ודיוק.",
    heroSub: "שני עשורים של בנייה מורכבת ויוקרתית בישראל.",
    g1Label: "קבלן רשום ג1",
    ctaLabel: "לתיק העבודות",
    ctaHref: "/he#portfolio",

    // Founder
    founderOverline: "המייסד",
    founderHeading: "מנהיגות\nמהשטח.",
    founderBody:
      'מזה שני עשורים שחברת "בנין איתן" מובילה פרויקטים מורכבים ויוקרתיים בישראל. מוטי איתן, מייסד ובעלים, מביא איתו ניסיון של מעל 20 שנה במגוון תפקידי מפתח: מיזמות ופיקוח ועד לניהול פרויקטים וביצוע בשטח.',
    founderName: "מוטי איתן",
    founderRole: "מייסד ובעלים, בנין איתן",

    // Standard
    standardOverline: "הסטנדרט שלנו",
    standardQuote:
      "האמון והשירות שאנו מעניקים עומדים במרכז העשייה שלנו, מתוך הבנה שבית בונים קודם כל עם אנשים.",

    // Expertise
    expertiseOverline: "נקודות חוזק",
    expertiseHeading: "מה\nמייחד אותנו.",
    expertise: [
      {
        num: "01",
        title: "ניסיון\nרב-תחומי",
        desc: "מהנדסת קונסטרוקציה ויציקות ועד גימורי יוקרה ואינטגרציה של מערכות — הכל בוצע בפיקוחנו הישיר, עם אחריות מלאה בכל שלב.",
      },
      {
        num: "02",
        title: "חזון\nיזמי",
        desc: "כל פרויקט מנוהל עם חשיבה של בעלים: לוח זמנים, תקציב ואיכות הם עמודי תווך שאין מתפשרים עליהם.",
      },
      {
        num: "03",
        title: "ליווי\nאישי",
        desc: "מוטי איתן מעורב אישית בכל שלב קריטי, ומוודא שכל החלטה משקפת את החזון של הלקוח ואת הסטנדרטים שלנו.",
      },
    ],

    // Stats
    stat1: { value: "20+", label: "שנות ניסיון" },
    stat2: { value: "150+", label: "פרויקטים שהושלמו" },
    stat3: { value: "ג1", label: "קבלן רשום" },
  },
} as const;

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
  const c = copy[l];
  const ArrowIcon = lang === "he" ? ArrowDownLeft : ArrowDownRight;

  return (
    <main className="relative" dir={dir}>
      <Navbar />

      {/* ── 1. HERO ────────────────────────────────────────────────────────── */}
      <section className="relative bg-charcoal overflow-hidden pt-44 pb-32 md:pt-56 md:pb-44">
        {/* Watermark */}
        <span
          className="pointer-events-none absolute end-0 top-1/2 -translate-y-1/2 select-none font-heading font-bold text-white/[0.03] leading-none"
          aria-hidden="true"
          style={{ fontSize: "clamp(10rem, 28vw, 26rem)" }}
        >
          02
        </span>

        <div className="relative mx-auto max-w-[1400px] px-6 lg:px-12">
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
                {lang === "he" ? "ג1" : "G1"}
              </span>
              <div className="h-6 w-px bg-accent/30" />
              <span className="font-body text-xs font-semibold tracking-[0.18em] uppercase text-accent/80">
                {c.g1Label}
              </span>
            </div>

            <p className="font-body text-base font-light text-bone/50 max-w-md leading-relaxed">
              {c.heroSub}
            </p>
          </FadeUp>

          {/* Stats row */}
          <FadeUp delay={0.28} className="mt-20 grid grid-cols-3 max-w-lg gap-px bg-bone/[0.06]">
            {[c.stat1, c.stat2, c.stat3].map((stat) => (
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
              href={c.ctaHref}
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
      <section className="bg-bone py-36 md:py-48 overflow-hidden">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
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
                <p className="mt-8 font-body text-base font-light leading-relaxed text-charcoal/55 md:text-lg max-w-lg">
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
                src="/bayit-vegan.jpg"
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
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="rule-thin" />
      </div>

      {/* ── 3. PHILOSOPHY / STANDARD ────────────────────────────────────────── */}
      <section className="bg-charcoal py-28 md:py-40">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
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
      <section className="bg-bone py-36 md:py-48">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 text-start">
          <div className="mb-16 md:mb-24">
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
            {c.expertise.map((item, i) => (
              <motion.div
                key={item.num}
                className="group bg-bone p-10 transition-colors duration-500 hover:bg-charcoal md:p-14 text-start"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
              >
                <span
                  className="font-heading text-5xl font-bold text-accent/20 transition-colors duration-500 group-hover:text-accent/40 block"
                  aria-hidden="true"
                >
                  {item.num}
                </span>
                <h3 className="mt-6 font-heading text-xl font-bold text-charcoal transition-colors duration-500 group-hover:text-bone md:text-2xl whitespace-pre-line">
                  {item.title}
                </h3>
                <p className="mt-4 font-body text-sm font-light leading-relaxed text-charcoal/55 transition-colors duration-500 group-hover:text-bone/55">
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
