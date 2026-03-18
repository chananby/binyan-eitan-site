"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLang } from "./LangContext";
import { useTranslationsRaw } from "./TranslationsProvider";

const WHATSAPP_HE =
  "https://wa.me/972585008447?text=%D7%94%D7%99%D7%99%20%D7%9E%D7%95%D7%98%D7%99%2C%20%D7%A7%D7%A8%D7%90%D7%AA%D7%99%20%D7%90%D7%AA%20%D7%94%D7%9E%D7%90%D7%9E%D7%A8%20%D7%91%D7%90%D7%AA%D7%A8%20%D7%95%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%93%D7%91%D7%A8%20%D7%A2%D7%9C%20%D7%A4%D7%A8%D7%95%D7%99%D7%A7%D7%98...";
const WHATSAPP_EN =
  "https://wa.me/972585008447?text=Hi%20Moti%2C%20I%20read%20your%20article%20and%20would%20like%20to%20discuss%20a%20project...";

// --- 1. הגדרת הממשק (Data Structure) ---
interface Article {
  id: string;
  slug: string;

  heroImage?: string;

  // שדות בעברית
  title_he: string;
  category_he?: string;
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
  category_en?: string;
  intro_en?: string;
  s1_title_en?: string;
  s1_body_en?: string;
  s2_title_en?: string;
  s2_body_en?: string;
  s3_title_en?: string;
  s3_body_en?: string;
  s4_title_he?: string;
  s4_body_he?: string;
  s4_title_en?: string;
  s4_body_en?: string;
  s5_title_he?: string;
  s5_body_he?: string;
  s5_title_en?: string;
  s5_body_en?: string;
  table_data_en?: string;
  tip_en?: string;
  summary_en?: string;
  cta_label_en?: string;
  cta_label_he?: string;
}

/** Renders **bold** markdown markers as <strong> inline elements. */
function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-bold">{part}</strong> : part
  );
}

function readingMinutes(article: Article, lang: "en" | "he"): number {
  const fields = ["intro", "s1_body", "s2_body", "s3_body", "s4_body", "s5_body", "tip", "summary"] as const;
  const text = fields.map((f) => (article[`${f}_${lang}` as keyof Article] as string) ?? "").join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wpm = lang === "he" ? 200 : 238;
  return Math.max(1, Math.round(words / wpm));
}

interface Props {
  slug: string;
}

const ui = {
  en: {
    back: "← Back to Knowledge Base",
    notFound: "Article not found.",
    ctaLabel: "Contact Us for Consultation",
    ctaSub: "Or call: 053-321-4208",
    tipTitle: "The Binyan Eitan Standard",
    share: "Share",
    minRead: (n: number) => `${n} min read`,
  },
  he: {
    back: "← חזרה לידע מקצועי",
    notFound: "המאמר לא נמצא.",
    ctaLabel: "פנו אלינו לייעוץ",
    ctaSub: "או התקשרו: 058-500-8447",
    tipTitle: "הביטחון של בנין איתן",
    share: "שתף",
    minRead: (n: number) => `${n} דקות קריאה`,
  },
} as const;

export default function ArticleDetailPage({ slug }: Props) {
  type Lang = "en" | "he";
  const { lang } = useLang() as { lang: Lang };
  const t = ui[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  const rawData = useTranslationsRaw() as Record<string, any>;
  const article: Article | null =
    (rawData?.articles as Article[] | undefined)?.find((a) => a.slug === slug) ?? null;

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
  const category = getField('category');
  const intro = getField('intro');
  const tip = getField('tip');
  const summary = getField('summary');
  const tableData = getField('table_data');
  const mins = readingMinutes(article, lang);

  // WhatsApp share URL (article-specific)
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${title} — https://binyaneitan.co.il/${lang}/expertise/${article.slug}`)}`;


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
          {/* Category chip + reading time */}
          <div className="flex items-center gap-3 mb-6">
            {category && (
              <span className="font-body text-[0.6rem] font-semibold tracking-[0.22em] uppercase px-2.5 py-1 bg-accent/[0.08] text-accent border border-accent/20">
                {category}
              </span>
            )}
            <span className="font-body text-[0.65rem] text-charcoal/35 tracking-wider">
              {t.minRead(mins)}
            </span>
          </div>
          {/* שימוש ב-border-s מתאים את עצמו ימינה לעברית ושמאלה לאנגלית */}
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-charcoal border-s-[8px] border-accent ps-6">
            {title}
          </h1>
        </div>
      </section>

      {/* --- Hero Image --- */}
      {article.heroImage && (
        <div className="relative w-full h-[320px] md:h-[480px] overflow-hidden bg-charcoal/10">
          <Image
            src={article.heroImage}
            alt={title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      )}

      {/* --- Article Body + Sidebar --- */}
      <article className="py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-8">
          <div className="flex gap-16 items-start">

            {/* ── Main content column ── */}
            <div className="min-w-0 flex-1">

          {/* פתיח יוקרתי (Intro) */}
          {intro && (
            <p className="font-body text-2xl md:text-3xl text-charcoal/70 mb-20 leading-relaxed italic font-light">
              {renderBold(intro)}
            </p>
          )}

          {/* פרקים דינמיים (עד 5 פרקים) */}
          {[1, 2, 3, 4, 5].map((num) => {
            const sTitle = getField(`s${num}_title`);
            const sBody = getField(`s${num}_body`);

            if (!sTitle && !sBody) return null;

            return (
              <section key={num} className="mb-16">
                {sTitle && (
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-charcoal mb-6 flex items-center gap-4">
                    <span className="h-[2px] w-12 bg-accent/60 shrink-0"></span>
                    {sTitle}
                  </h2>
                )}
                {sBody && (
                  <p className="font-body text-lg leading-loose text-charcoal/80 whitespace-pre-wrap">
                    {renderBold(sBody)}
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
          <div className="mt-24 pt-16 text-center border-t border-warm-gray-light/50 space-y-4">
            <a
              href={lang === "he" ? WHATSAPP_HE : WHATSAPP_EN}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-accent text-bone px-12 py-5 font-body text-sm font-bold tracking-[0.25em] uppercase transition-all duration-300 hover:bg-charcoal hover:shadow-lg inline-block"
            >
              {(lang === "en" ? article.cta_label_en : article.cta_label_he) ?? t.ctaLabel}
            </a>
            <p className="font-body text-sm text-charcoal/40">{t.ctaSub}</p>
            <div className="pt-2">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-body text-xs text-charcoal/40 hover:text-accent transition-colors duration-200 tracking-wider uppercase"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {t.share}
              </a>
            </div>
          </div>

            </div>{/* end main content column */}

            {/* ── Sticky Sidebar ── */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-28 flex flex-col gap-5">

                {/* Contact CTA card */}
                <div className="border border-accent/25 bg-white p-7 space-y-5">
                  <div>
                    <p className="font-body text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-accent mb-2">
                      {lang === "he" ? "ייעוץ חינם" : "Free Consultation"}
                    </p>
                    <p className="font-heading text-lg font-bold text-charcoal leading-snug">
                      {lang === "he"
                        ? "מוכנים להתחיל את הפרויקט?"
                        : "Ready to start your project?"}
                    </p>
                    <p className="mt-2 font-body text-sm text-charcoal/55 leading-relaxed">
                      {lang === "he"
                        ? "קבלן שיפוצים ובנייה בירושלים ובנימין — עבודה עברית מקצועית."
                        : "Licensed G1 contractor in Jerusalem. Professional, transparent, accountable."}
                    </p>
                  </div>
                  <a
                    href={lang === "he" ? WHATSAPP_HE : WHATSAPP_EN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-accent text-bone py-4 font-body text-xs font-bold tracking-[0.2em] uppercase hover:bg-charcoal transition-colors duration-300"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {lang === "he" ? "שלחו הודעה" : "WhatsApp Us"}
                  </a>
                  <a
                    href={`/${lang}#contact`}
                    className="flex items-center justify-center w-full border border-charcoal/20 text-charcoal py-3.5 font-body text-xs font-semibold tracking-[0.18em] uppercase hover:border-accent hover:text-accent transition-colors duration-200"
                  >
                    {lang === "he" ? "טופס יצירת קשר" : "Contact Form"}
                  </a>
                </div>

                {/* G1 badge card */}
                <div className="border border-warm-gray-light bg-bone p-6 space-y-2">
                  <p className="font-body text-[0.55rem] font-semibold tracking-[0.25em] uppercase text-charcoal/35">
                    {lang === "he" ? "רישוי" : "License"}
                  </p>
                  <p className="font-heading text-sm font-bold text-charcoal">
                    {lang === "he" ? "קבלן רשום ג1" : "G1 Registered Contractor"}
                  </p>
                  <p className="font-body text-xs text-charcoal/50">
                    {lang === "he" ? "מס׳ 41805 — ענף 100" : "No. 41805 — Branch 100"}
                  </p>
                </div>

              </div>
            </aside>

          </div>{/* end flex row */}
        </div>
      </article>

      <Footer />
    </main>
  );
}