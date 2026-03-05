"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLang } from "./LangContext";

// --- 1. הגדרת הממשק (Data Structure) ---
interface Article {
  id: string;
  slug: string;
  
  // שדות בעברית
  title_he: string;
  intro_he?: string;
  s1_title_he?: string;
  s1_body_he?: string;
  s2_title_he?: string;
  s2_body_he?: string;
  s3_title_he?: string;
  s3_body_he?: string;
  table_data_he?: string; 
  tip_he?: string;
  summary_he?: string;
  
  // שדות באנגלית
  title_en: string;
  intro_en?: string;
  s1_title_en?: string;
  s1_body_en?: string;
  s2_title_en?: string;
  s2_body_en?: string;
  s3_title_en?: string;
  s3_body_en?: string;
  table_data_en?: string;
  tip_en?: string;
  summary_en?: string;
  cta_label_en?: string;
  cta_label_he?: string;
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
    tipTitle: "The Binyan Eitan Standard",
  },
  he: {
    back: "← חזרה לידע מקצועי",
    notFound: "המאמר לא נמצא.",
    ctaLabel: "פנו אלינו לייעוץ",
    contactHref: "#contact",
    tipTitle: "הביטחון של בנין איתן",
  },
} as const;

export default function ArticleDetailPage({ slug }: Props) {
  type Lang = "en" | "he";
  const { lang } = useLang() as { lang: Lang };
  const t = ui[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  const [article, setArticle] = useState<Article | null | "loading">("loading");

  // --- 2. משיכת הנתונים (Data Fetching) ---
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

  // מצב טעינה (Loading State)
  if (article === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  // מצב שגיאה/לא נמצא (Not Found State)
  if (article === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-bone">
        <p className="font-body text-lg text-charcoal/60">{t.notFound}</p>
        <Link href={`/${lang}/expertise`} className="text-accent uppercase tracking-widest font-semibold hover:opacity-80 transition-opacity">
          {t.back}
        </Link>
      </div>
    );
  }

  // Helper חכם לשליפת המידע לפי השפה הנוכחית
  const getField = (key: string): string => {
    const val = article[`${key}_${lang}` as keyof Article] || article[key as keyof Article];
    return typeof val === 'string' ? val : '';
  };

  // משיכת השדות למשתנים (לנוחות קריאה בקוד)
  const title = getField('title');
  const intro = getField('intro');
  const tip = getField('tip');
  const summary = getField('summary');
  const tableData = getField('table_data');

  return (
    <main className="relative bg-bone min-h-screen selection:bg-accent/20" dir={dir}>
      <Navbar />

      {/* --- Header / Hero Section --- */}
      <section className="pt-36 pb-16 md:pt-44 md:pb-20 border-b border-warm-gray-light">
        <div className="mx-auto max-w-[860px] px-8">
          <Link 
            href={`/${lang}/expertise`} 
            className="inline-flex items-center gap-2 font-body text-xs md:text-sm text-accent mb-10 uppercase tracking-[0.2em] hover:text-charcoal transition-colors"
          >
            {t.back}
          </Link>
          {/* שימוש ב-border-s מתאים את עצמו ימינה לעברית ושמאלה לאנגלית */}
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-charcoal border-s-[8px] border-accent ps-6">
            {title}
          </h1>
        </div>
      </section>

      {/* --- Article Body --- */}
      <article className="py-16 md:py-24">
        <div className="mx-auto max-w-[860px] px-8">
          
          {/* פתיח יוקרתי (Intro) */}
          {intro && (
            <p className="font-body text-2xl md:text-3xl text-charcoal/70 mb-20 leading-relaxed italic font-light">
              {intro}
            </p>
          )}

          {/* פרקים דינמיים (עד 3 פרקים) */}
          {[1, 2, 3].map((num) => {
            const sTitle = getField(`s${num}_title`);
            const sBody = getField(`s${num}_body`);
            
            if (!sTitle && !sBody) return null;
            
            return (
              <section key={num} className="mb-16">
                {sTitle && (
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-charcoal mb-6 flex items-center gap-4">
                    <span className="h-[2px] w-12 bg-accent/60"></span>
                    {sTitle}
                  </h2>
                )}
                {sBody && (
                  <p className="font-body text-lg leading-loose text-charcoal/80 whitespace-pre-wrap">
                    {sBody}
                  </p>
                )}
              </section>
            );
          })}

          {/* רכיב השוואה יוקרתי (Table / Grid) */}
          {tableData && (
            <div className="my-24 border border-warm-gray-light rounded-sm overflow-hidden bg-white/60 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-s divide-warm-gray-light">
                {tableData.split('|').map((item, idx) => {
                  const parts = item.split(':');
                  // הגנה מקריסה במקרה של שגיאת הקלדה
                  if (parts.length < 2) return null; 
                  
                  const key = parts[0].trim();
                  const val = parts.slice(1).join(':').trim(); // מחבר חזרה למקרה שהיה נקודתיים בתוכן
                  
                  return (
                    <div key={idx} className="p-8 md:p-10 hover:bg-white transition-colors duration-500">
                      <span className="block text-accent font-bold mb-4 uppercase text-sm tracking-[0.2em]">{key}</span>
                      <span className="text-charcoal/85 text-lg leading-relaxed block">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* הטיפ של מוטי (Premium Quote Box) */}
          {tip && (
            <div className="my-24 p-10 md:p-14 bg-charcoal text-bone relative overflow-hidden shadow-xl rounded-sm">
              {/* אייקון מרכאות גרפי ענק ברקע */}
              <div className="absolute -top-4 start-4 text-bone/5 text-[15rem] font-serif leading-none select-none pointer-events-none">"</div>
              <div className="relative z-10">
                <h4 className="text-accent font-bold mb-6 text-xs md:text-sm uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-accent"></span>
                  {t.tipTitle}
                </h4>
                <p className="text-2xl md:text-3xl italic leading-relaxed font-light opacity-95">
                  {tip}
                </p>
              </div>
            </div>
          )}

          {/* סיכום (Summary) */}
          {summary && (
            <div className="mt-20 pt-12 border-t border-warm-gray-light">
              <p className="font-heading text-2xl md:text-3xl font-bold text-charcoal text-center opacity-85 leading-relaxed">
                {summary}
              </p>
            </div>
          )}

          {/* --- CTA Footer --- */}
          <div className="mt-24 pt-16 text-center border-t border-warm-gray-light/50">
            <Link
              href={`/${lang}${t.contactHref}`}
              className="bg-accent text-bone px-12 py-5 font-body text-sm font-bold tracking-[0.25em] uppercase transition-all duration-300 hover:bg-charcoal hover:shadow-lg inline-block"
            >
              {(lang === "en" ? article.cta_label_en : article.cta_label_he) ?? t.ctaLabel}
            </Link>
          </div>
          
        </div>
      </article>

      <Footer />
    </main>
  );
}