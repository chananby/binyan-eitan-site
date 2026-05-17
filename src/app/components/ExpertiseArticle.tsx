"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLang } from "./LangContext";
import { useTranslationsRaw } from "./TranslationsProvider";

interface Article {
  id: string;
  slug: string;
  heroImage?: string;
  title_en: string;
  title_he: string;
  category_en?: string;
  category_he?: string;
  intro_en?: string;
  intro_he?: string;
  archived?: boolean;
  s1_body_en?: string; s1_body_he?: string;
  s2_body_en?: string; s2_body_he?: string;
  s3_body_en?: string; s3_body_he?: string;
  s4_body_en?: string; s4_body_he?: string;
  s5_body_en?: string; s5_body_he?: string;
  tip_en?: string; tip_he?: string;
  summary_en?: string; summary_he?: string;
}

function readingMinutes(article: Article, lang: "en" | "he"): number {
  const fields = [
    "intro", "s1_body", "s2_body", "s3_body", "s4_body", "s5_body", "tip", "summary",
  ] as const;
  const text = fields
    .map((f) => (article[`${f}_${lang}` as keyof Article] as string) ?? "")
    .join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wpm = lang === "he" ? 200 : 238;
  return Math.max(1, Math.round(words / wpm));
}

const ui = {
  en: {
    overline: "Knowledge Base",
    heading: "Engineering\nInsights.",
    sub: "Professional articles on modern construction, renovation best practices, and project management.",
    articlesHeading: "Professional Articles",
    readMore: "Read Article",
    empty: "No articles published yet.",
    minRead: (n: number) => `${n} min read`,
  },
  he: {
    overline: "ידע מקצועי",
    heading: "תובנות\nמקצועיות.",
    sub: "מאמרים על בנייה ושיפוצים, מניעת טעויות, ניהול פרויקטים — מהשטח.",
    articlesHeading: "מאמרים מקצועיים",
    readMore: "קרא מאמר",
    empty: "אין מאמרים פורסמו עדיין.",
    minRead: (n: number) => `${n} דקות קריאה`,
  },
} as const;

// Fallback gradient colors per card index
const CARD_GRADIENTS = [
  "from-charcoal to-charcoal/80",
  "from-accent/80 to-accent/50",
  "from-charcoal/90 to-accent/30",
  "from-charcoal to-charcoal/70",
  "from-accent/70 to-charcoal/60",
  "from-charcoal/80 to-charcoal/50",
];

export default function ExpertiseArticle() {
  type Lang = "en" | "he";
  const { lang } = useLang() as { lang: Lang };
  const c = ui[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  const rawData = useTranslationsRaw() as Record<string, unknown>;
  const articles: Article[] = Array.isArray(rawData?.articles)
    ? (rawData.articles as Article[]).filter(
        // Exclude archived (legacy) AND drafts (published === false).
        // Articles without a `published` field are treated as published
        // (backward-compat for content predating the draft flag).
        (a) => !a.archived && (a as { published?: boolean }).published !== false,
      )
    : [];

  return (
    <main className="relative bg-bone" dir={dir}>
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-bone pt-36 pb-16 md:pt-44 md:pb-20">
        <div className="mx-auto max-w-[1100px] px-8">
          <p className="overline-label mb-6 flex items-center gap-3">
            <span className="inline-block h-px w-6 bg-accent align-middle" />
            {c.overline}
          </p>
          <h1 className="font-heading text-4xl font-bold leading-tight text-charcoal md:text-5xl lg:text-6xl whitespace-pre-line">
            {c.heading}
          </h1>
          <p className="mt-6 font-body text-lg text-charcoal/60 leading-relaxed max-w-xl">{c.sub}</p>
          <div className="mt-8 h-px w-16 bg-accent/40" />
        </div>
      </section>

      <div className="border-b border-warm-gray-light" />

      {/* ── Articles Grid ── */}
      <section className="bg-bone py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-8">
          <h2 className="font-heading text-2xl font-bold text-charcoal mb-10">
            {c.articlesHeading}
          </h2>

          {articles.length === 0 ? (
            <p className="text-charcoal/50 font-body text-lg text-center py-10">{c.empty}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => {
                const title = lang === "en" ? article.title_en : article.title_he;
                const category = lang === "en" ? article.category_en : article.category_he;
                const body = (lang === "en" ? article.intro_en : article.intro_he) ?? "";
                const excerpt = body.replace(/\n/g, " ").slice(0, 130) + (body.length > 130 ? "…" : "");
                const mins = readingMinutes(article, lang);

                return (
                  <Link
                    key={article.id}
                    href={`/${lang}/expertise/${article.slug}`}
                    className="group flex flex-col bg-white border border-warm-gray-light hover:border-accent/30 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[16/9] overflow-hidden bg-charcoal/10">
                      {article.heroImage ? (
                        <Image
                          src={article.heroImage}
                          alt={`${title} — ${category ?? ""} | בניין איתן`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${CARD_GRADIENTS[index % CARD_GRADIENTS.length]}`} />
                      )}
                      {/* Category chip over image */}
                      {category && (
                        <div className="absolute top-3 start-3 z-10">
                          <span className="font-body text-[0.55rem] font-semibold tracking-[0.2em] uppercase px-2.5 py-1 bg-white/90 backdrop-blur-sm text-accent border border-accent/20">
                            {category}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="flex flex-col flex-1 p-6 gap-3">
                      {/* Reading time */}
                      <p className="font-body text-[0.6rem] text-charcoal/35 tracking-wider">
                        {c.minRead(mins)}
                      </p>

                      {/* Title */}
                      <h3 className="font-heading text-lg font-bold text-charcoal group-hover:text-accent transition-colors duration-200 leading-snug">
                        {title}
                      </h3>

                      {/* Excerpt */}
                      <p className="font-body text-sm text-charcoal/60 leading-relaxed flex-1">
                        {excerpt}
                      </p>

                      {/* Read more */}
                      <span className="mt-2 inline-flex items-center gap-1.5 font-body text-xs font-semibold tracking-[0.18em] uppercase text-accent group-hover:text-accent-dark transition-colors duration-200 self-start border-b border-accent/30 pb-0.5">
                        {c.readMore}
                        <span className="transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">→</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="border-b border-warm-gray-light" />
      <Footer />
    </main>
  );
}
