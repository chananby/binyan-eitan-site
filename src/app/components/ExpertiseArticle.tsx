"use client";

import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLang } from "./LangContext";

const pillars = {
  he: [
    {
      num: "01",
      title: "הסמכה וסיווג מקצועי (קבלן ג1)",
      body: "לא מדובר רק בנייר. סיווג קבלני מבטיח שיש גוף הנדסי שאחראי על הבטיחות והיציבות של המבנה. בחירה בקבלן רשום היא תעודת הביטוח שלכם מול כל תקלה עתידית.",
    },
    {
      num: "02",
      title: "אינטגרציה בין חומרים",
      body: "בנייה מודרנית משלבת בטון מזוין עם אלמנטים של פלדה כבדה. הדיוק בנקודות המפגש בין החומרים הוא קריטי. מומחיות בשני העולמות מאפשרת ביצוע חלק ומונעת כשלים הנדסיים בטווח הארוך.",
    },
    {
      num: "03",
      title: "שקיפות טכנולוגית",
      body: 'הימים של "סמוך עליי" נגמרו. לקוח או מפקח צריכים לדעת מה קורה בשטח בזמן אמת. שימוש בכלי ניהול דיגיטליים לאישור שינויים ותיעוד הביצוע הוא הסטנדרט החדש של עולם הפרימיום.',
    },
  ],
  en: [
    {
      num: "01",
      title: "C1 Registered Certification",
      body: "Never compromise on safety or legality. A C1 registered contractor (Gimmel-1) is legally authorized and insured to handle complex structural engineering, providing the necessary guarantees for your peace of mind.",
    },
    {
      num: "02",
      title: "Israeli Innovation Meets Global Standards",
      body: "We combine legendary Israeli ingenuity with meticulous finishing standards. By integrating advanced steel construction and high-precision concrete work, we ensure that every detail — from the foundation to the final touch — is executed with absolute precision.",
    },
    {
      num: "03",
      title: "Transparent Project Management",
      body: "Remote building requires 100% transparency. We utilize digital tools for real-time reporting, change-order approvals, and photo documentation, allowing you to oversee your Jerusalem project from New York or Miami with total confidence.",
    },
    {
      num: "04",
      title: "Engineering Expertise",
      body: "Whether it's a luxury villa or a complex communal structure, we speak the language of architects and structural engineers. Our deep local knowledge ensures that international designs are translated perfectly into the Israeli landscape.",
    },
  ],
} as const;

const content = {
  he: {
    overline: "ידע מקצועי",
    title: "אתגרים הנדסיים בבנייה מודרנית",
    intro:
      'בענף הבנייה הישראלי, המורכבות ההנדסית הולכת ועולה. פרויקטים של מבני ציבור, בתי כנסת וווילות יוקרה דורשים היום הרבה מעבר ל"בנייה רגילה". הם דורשים יכולת ניהול של מערכות מורכבות, דיוק בפרטי קונסטרוקציה ושליטה בלוחות זמנים קשיחים.',
    pillarsLabel:
      "כשניגשים לפרויקט מורכב – כמו הנפת גג פלדה במשקל 100 טון או בנייה באתרים מאוכלסים – ישנם שלושה עמודי תווך שקובעים את הצלחת הפרויקט:",
    closing:
      'ב"בנין איתן", אנו מאמינים שכל שלד הוא הבסיס לביטחון שלכם. אנחנו רותמים את הניסיון שלנו בביצוע פרויקטים הנדסיים "בלתי אפשריים" כדי להעניק ללקוחותינו שקט נפשי – מהבור ועד הגמר.',
    backLabel: "חזרה לאתר",
    ctaLabel: "פנו אלינו לייעוץ",
  },
  en: {
    overline: "Professional Knowledge",
    title: "Building Your Israeli Property",
    intro:
      "For many international residents, especially from the US, building or renovating a property in Israel is a long-held dream. At Binyan Eitan, we specialize in making that dream a seamless reality. We don't just build — we manage the entire engineering process to ensure your project meets the premium quality you expect, backed by world-class Israeli engineering.",
    pillarsLabel:
      "What should you look for in your Israeli construction partner?",
    closing:
      "Your Israeli dream is within reach. Partner with Binyan Eitan and build with total confidence — whether you're directing the project from Jerusalem or from New York.",
    backLabel: "Back to site",
    ctaLabel: "Start your project",
  },
} as const;

export default function ExpertiseArticle() {
  type Lang = "en" | "he";
  const { lang } = useLang() as { lang: Lang };
  const c = content[lang];
  const p = pillars[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  return (
    <main className="relative bg-bone" dir={dir}>
      <Navbar />

      {/* Article Hero */}
      <section className="bg-bone pt-36 pb-16 md:pt-44 md:pb-20">
        <div className="mx-auto max-w-[860px] px-8">
          <p className="overline-label mb-6 flex items-center gap-3">
            <span className="inline-block h-px w-6 bg-accent align-middle" />
            {c.overline}
          </p>
          <h1 className="font-heading text-4xl font-bold leading-tight text-charcoal md:text-5xl lg:text-6xl">
            {c.title}
          </h1>
          <div className="mt-8 h-px w-16 bg-accent/40" />
        </div>
      </section>

      <div className="border-b border-warm-gray-light" />

      {/* Article Body */}
      <article className="bg-bone py-16 md:py-24">
        <div className="mx-auto max-w-[860px] px-8 space-y-12">

          {/* Intro */}
          <p className="font-body text-lg leading-relaxed text-charcoal/75 md:text-xl">
            {c.intro}
          </p>

          {/* Pillars bridge sentence */}
          <p className="font-body text-base font-semibold leading-relaxed text-charcoal/80 tracking-wide">
            {c.pillarsLabel}
          </p>

          {/* Pillars */}
          <div className="space-y-10 border-t border-warm-gray-light pt-10">
            {p.map((pillar: { num: string; title: string; body: string }) => (
              <div key={pillar.num} className="grid grid-cols-[auto_1fr] gap-6 items-start">
                <span className="font-heading text-5xl font-bold text-accent/20 leading-none select-none">
                  {pillar.num}
                </span>
                <div>
                  <h2 className="font-heading text-xl font-bold text-charcoal md:text-2xl">
                    {pillar.title}
                  </h2>
                  <p className="mt-3 font-body text-base leading-relaxed text-charcoal/60">
                    {pillar.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Closing */}
          <div className="border-t border-warm-gray-light pt-10">
            <blockquote className="border-s-2 border-accent ps-6">
              <p className="font-body text-lg leading-relaxed text-charcoal/75 italic md:text-xl">
                {c.closing}
              </p>
            </blockquote>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href={`/${lang}#contact`}
              className="bg-accent text-bone px-8 py-4 font-body text-sm font-semibold tracking-[0.2em] uppercase transition-colors duration-300 hover:bg-accent-dark"
            >
              {c.ctaLabel}
            </Link>
            <Link
              href={`/${lang}`}
              className="border border-charcoal/20 text-charcoal px-8 py-4 font-body text-sm font-semibold tracking-[0.2em] uppercase transition-colors duration-300 hover:border-accent hover:text-accent"
            >
              {c.backLabel}
            </Link>
          </div>
        </div>
      </article>

      <div className="border-b border-warm-gray-light" />
      <Footer />
    </main>
  );
}
