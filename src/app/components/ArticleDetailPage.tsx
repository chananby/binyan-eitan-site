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

interface Props {
  slug: string;
}

const ui = {
  en: {
    back: "← Back to Knowledge Base",
    notFound: "Article not found.",
    ctaLabel: "Start your project",
    contactHref: "#contact",
  },
  he: {
    back: "← חזרה לידע מקצועי",
    notFound: "המאמר לא נמצא.",
    ctaLabel: "פנו אלינו לייעוץ",
    contactHref: "#contact",
  },
} as const;

export default function ArticleDetailPage({ slug }: Props) {
  type Lang = "en" | "he";
  const { lang } = useLang() as { lang: Lang };
  const t = ui[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  const [article, setArticle] = useState<Article | null | "loading">("loading");

  useEffect(() => {
    fetch("/api/translations", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const found = (data?.articles as Article[] | undefined)?.find(
          (a) => a.slug === slug
        );
        setArticle(found ?? null);
      })
      .catch(() => setArticle(null));
  }, [slug]);

  const title =
    article && article !== "loading"
      ? lang === "en"
        ? article.title_en
        : article.title_he
      : "";
  const content =
    article && article !== "loading"
      ? lang === "en"
        ? article.content_en
        : article.content_he
      : "";

  const paragraphs = content.split(/\n\n+/).filter(Boolean);

  return (
    <main className="relative bg-bone" dir={dir}>
      <Navbar />

      {article === "loading" ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
        </div>
      ) : article === null ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6">
          <p className="font-body text-lg text-charcoal/60">{t.notFound}</p>
          <Link
            href={`/${lang}/expertise`}
            className="font-body text-sm font-semibold text-accent uppercase tracking-widest hover:text-accent-dark transition-colors"
          >
            {t.back}
          </Link>
        </div>
      ) : (
        <>
          {/* Article hero */}
          <section className="bg-bone pt-36 pb-16 md:pt-44 md:pb-20">
            <div className="mx-auto max-w-[860px] px-8">
              <Link
                href={`/${lang}/expertise`}
                className="inline-flex items-center gap-2 font-body text-sm text-accent hover:text-accent-dark mb-8 uppercase tracking-widest transition-colors"
              >
                {t.back}
              </Link>
              <h1 className="font-heading text-4xl font-bold leading-tight text-charcoal md:text-5xl lg:text-6xl">
                {title}
              </h1>
              <div className="mt-8 h-px w-16 bg-accent/40" />
            </div>
          </section>

          <div className="border-b border-warm-gray-light" />

          {/* Article body */}
          <article className="bg-bone py-16 md:py-24">
            <div className="mx-auto max-w-[860px] px-8 space-y-6">
              {paragraphs.map((para, i) => (
                <p key={i} className="font-body text-lg leading-relaxed text-charcoal/75">
                  {para}
                </p>
              ))}

              {/* CTA */}
              <div className="border-t border-warm-gray-light pt-10 mt-10">
                <Link
                  href={`/${lang}${t.contactHref}`}
                  className="bg-accent text-bone px-8 py-4 font-body text-sm font-semibold tracking-[0.2em] uppercase transition-colors duration-300 hover:bg-accent-dark inline-block"
                >
                  {t.ctaLabel}
                </Link>
              </div>
            </div>
          </article>

          <div className="border-b border-warm-gray-light" />
        </>
      )}

      <Footer />
    </main>
  );
}
