"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLang } from "./LangContext";

interface Article {
  id: string;
  slug: string;
  title_en: string;
  title_he: string;
  category_en?: string;
  category_he?: string;
  intro_en?: string;
  intro_he?: string;
  s1_body_en?: string; s1_body_he?: string;
  s2_body_en?: string; s2_body_he?: string;
  tip_en?: string; tip_he?: string;
  summary_en?: string; summary_he?: string;
}

function readingMinutes(article: Article, lang: "en" | "he"): number {
  const fields = ["intro", "s1_body", "s2_body", "tip", "summary"] as const;
  const text = fields.map((f) => (article[`${f}_${lang}` as keyof Article] as string) ?? "").join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wpm = lang === "he" ? 200 : 238;
  return Math.max(1, Math.round(words / wpm));
}

const ui = {
  en: {
    overline: "Knowledge Base",
    heading: "Engineering\nInsights.",
    sub: "Professional articles on modern construction, engineering challenges, and project management.",
    articlesHeading: "Professional Articles",
    readMore: "Read Article",
    empty: "No articles published yet.",
  },
  he: {
    overline: "ידע מקצועי",
    heading: "תובנות\nהנדסיות.",
    sub: "מאמרים מקצועיים בנושאי בנייה מודרנית, אתגרים הנדסיים וניהול פרויקטים.",
    articlesHeading: "מאמרים מקצועיים",
    readMore: "קרא מאמר",
    empty: "אין מאמרים פורסמו עדיין.",
  },
} as const;

export default function ExpertiseArticle() {
  type Lang = "en" | "he";
  const { lang } = useLang() as { lang: Lang };
  const c = ui[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/translations", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.articles)) setArticles(data.articles);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="relative bg-bone" dir={dir}>
      <Navbar />

      {/* Hero */}
      <section className="bg-bone pt-36 pb-16 md:pt-44 md:pb-20">
        <div className="mx-auto max-w-[860px] px-8">
          <p className="overline-label mb-6 flex items-center gap-3">
            <span className="inline-block h-px w-6 bg-accent align-middle" />
            {c.overline}
          </p>
          <h1 className="font-heading text-4xl font-bold leading-tight text-charcoal md:text-5xl lg:text-6xl whitespace-pre-line">
            {c.heading}
          </h1>
          <p className="mt-6 font-body text-lg text-charcoal/60 leading-relaxed">{c.sub}</p>
          <div className="mt-8 h-px w-16 bg-accent/40" />
        </div>
      </section>

      <div className="border-b border-warm-gray-light" />

      {/* Articles */}
      <section className="bg-bone py-16 md:py-24">
        <div className="mx-auto max-w-[860px] px-8">
          <h2 className="font-heading text-2xl font-bold text-charcoal mb-10">
            {c.articlesHeading}
          </h2>

          {loading ? (
            <div className="divide-y divide-warm-gray-light">
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-10 space-y-3">
                  <div className="h-6 w-2/3 bg-charcoal/[0.07] animate-pulse rounded-sm" />
                  <div className="h-4 w-full bg-charcoal/[0.05] animate-pulse rounded-sm" />
                  <div className="h-4 w-4/5 bg-charcoal/[0.05] animate-pulse rounded-sm" />
                  <div className="h-3 w-24 bg-accent/20 animate-pulse rounded-sm mt-2" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <p className="text-charcoal/50 font-body text-lg text-center py-10">{c.empty}</p>
          ) : (
            <div className="divide-y divide-warm-gray-light">
              {articles.map((article) => {
                const title = lang === "en" ? article.title_en : article.title_he;
                const category = lang === "en" ? article.category_en : article.category_he;
                const body = (lang === "en" ? article.intro_en : article.intro_he) ?? "";
                const excerpt = body.replace(/\n/g, " ").slice(0, 180) + (body.length > 180 ? "…" : "");
                const mins = readingMinutes(article, lang);
                const minLabel = lang === "he" ? `${mins} דקות קריאה` : `${mins} min read`;
                return (
                  <div key={article.id} className="py-10 group">
                    <Link href={`/${lang}/expertise/${article.slug}`}>
                      {/* Category + reading time row */}
                      <div className="flex items-center gap-3 mb-4">
                        {category && (
                          <span className="font-body text-[0.6rem] font-semibold tracking-[0.22em] uppercase px-2.5 py-1 bg-accent/[0.08] text-accent border border-accent/20">
                            {category}
                          </span>
                        )}
                        <span className="font-body text-[0.65rem] text-charcoal/35 tracking-wider">
                          {minLabel}
                        </span>
                      </div>
                      <h3 className="font-heading text-2xl font-bold text-charcoal group-hover:text-accent transition-colors duration-200 mb-3">
                        {title}
                      </h3>
                      <p className="font-body text-base text-charcoal/60 leading-relaxed mb-5">
                        {excerpt}
                      </p>
                      <span className="font-body text-sm font-semibold tracking-[0.18em] uppercase text-accent group-hover:text-accent-dark transition-colors duration-200">
                        {c.readMore} →
                      </span>
                    </Link>
                  </div>
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
