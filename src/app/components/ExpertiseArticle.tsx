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
  content_en: string;
  content_he: string;
}

interface Faq {
  id: string;
  question_en: string;
  question_he: string;
  answer_en: string;
  answer_he: string;
}

const ui = {
  en: {
    overline: "Knowledge Base",
    heading: "Engineering\nInsights.",
    sub: "Professional articles on modern construction, engineering challenges, and project management.",
    articlesHeading: "Professional Articles",
    faqHeading: "Common Questions",
    readMore: "Read Article",
    emptyArticles: "No articles published yet.",
    emptyFaq: "No FAQ entries yet.",
  },
  he: {
    overline: "ידע מקצועי",
    heading: "תובנות\nהנדסיות.",
    sub: "מאמרים מקצועיים בנושאי בנייה מודרנית, אתגרים הנדסיים וניהול פרויקטים.",
    articlesHeading: "מאמרים מקצועיים",
    faqHeading: "שאלות נפוצות",
    readMore: "קרא מאמר",
    emptyArticles: "אין מאמרים פורסמו עדיין.",
    emptyFaq: "אין שאלות נפוצות עדיין.",
  },
} as const;

export default function ExpertiseArticle() {
  type Lang = "en" | "he";
  const { lang } = useLang() as { lang: Lang };
  const c = ui[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  const [articles, setArticles] = useState<Article[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/translations", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.articles)) setArticles(data.articles);
        if (Array.isArray(data?.faqs)) setFaqs(data.faqs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleFaq = (id: string) => setOpenFaq((prev) => (prev === id ? null : id));

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

      {loading ? (
        <section className="bg-bone py-24">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
          </div>
        </section>
      ) : (
        <>
          {/* ── Professional Articles ── */}
          <section id="articles" className="scroll-mt-24 bg-bone py-16 md:py-24">
            <div className="mx-auto max-w-[860px] px-8">
              <h2 className="font-heading text-2xl font-bold text-charcoal mb-10">
                {c.articlesHeading}
              </h2>

              {articles.length === 0 ? (
                <p className="text-charcoal/50 font-body text-lg text-center py-10">{c.emptyArticles}</p>
              ) : (
                <div className="divide-y divide-warm-gray-light">
                  {articles.map((article) => {
                    const title = lang === "en" ? article.title_en : article.title_he;
                    const body = lang === "en" ? article.content_en : article.content_he;
                    const excerpt =
                      body.replace(/\n/g, " ").slice(0, 180) + (body.length > 180 ? "…" : "");
                    return (
                      <div key={article.id} className="py-10 group">
                        <Link href={`/${lang}/expertise/${article.slug}`}>
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

          {/* ── FAQ Accordion ── */}
          <section id="faq" className="scroll-mt-24 bg-bone py-16 md:py-24">
            <div className="mx-auto max-w-[860px] px-8">
              <h2 className="font-heading text-2xl font-bold text-charcoal mb-10">
                {c.faqHeading}
              </h2>

              {faqs.length === 0 ? (
                <p className="text-charcoal/50 font-body text-lg text-center py-10">{c.emptyFaq}</p>
              ) : (
                <div className="divide-y divide-warm-gray-light">
                  {faqs.map((faq) => {
                    const question = lang === "en" ? faq.question_en : faq.question_he;
                    const answer = lang === "en" ? faq.answer_en : faq.answer_he;
                    const isOpen = openFaq === faq.id;
                    return (
                      <div key={faq.id}>
                        <button
                          onClick={() => toggleFaq(faq.id)}
                          className="w-full flex items-center justify-between gap-4 py-6 text-start group"
                          aria-expanded={isOpen}
                        >
                          <span className="font-heading text-lg font-semibold text-charcoal group-hover:text-accent transition-colors duration-200">
                            {question}
                          </span>
                          <span
                            className="shrink-0 text-accent text-xl font-light transition-transform duration-200"
                            style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                          >
                            +
                          </span>
                        </button>
                        {isOpen && (
                          <p className="pb-6 font-body text-base text-charcoal/70 leading-relaxed">
                            {answer}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <div className="border-b border-warm-gray-light" />
      <Footer />
    </main>
  );
}
