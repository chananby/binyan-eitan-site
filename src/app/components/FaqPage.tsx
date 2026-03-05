"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLang } from "./LangContext";

interface Faq {
  id: string;
  question_en: string;
  question_he: string;
  answer_en: string;
  answer_he: string;
  link_href?: string;
  link_text_en?: string;
  link_text_he?: string;
}

const ui = {
  en: {
    overline: "Knowledge Base",
    heading: "Common\nQuestions.",
    sub: "Answers to the most frequent questions we receive about construction projects, licensing, and remote management.",
    faqHeading: "Frequently Asked Questions",
    empty: "No FAQ entries yet.",
  },
  he: {
    overline: "ידע מקצועי",
    heading: "שאלות\nנפוצות.",
    sub: "תשובות לשאלות הנפוצות ביותר שאנו מקבלים בנושאי בנייה, רישוי וניהול פרויקטים מרחוק.",
    faqHeading: "שאלות ותשובות",
    empty: "אין שאלות נפוצות עדיין.",
  },
} as const;

export default function FaqPage() {
  type Lang = "en" | "he";
  const { lang } = useLang() as { lang: Lang };
  const c = ui[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/translations", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
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

      {/* FAQ Accordion */}
      <section className="bg-bone-dark py-16 md:py-24">
        <div className="mx-auto max-w-[860px] px-8">
          <h2 className="font-heading text-2xl font-bold text-charcoal mb-10">
            {c.faqHeading}
          </h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
            </div>
          ) : faqs.length === 0 ? (
            <p className="text-charcoal/50 font-body text-lg text-center py-10">{c.empty}</p>
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
                      <div className="pb-6">
                        <p className="font-body text-base text-charcoal/70 leading-relaxed">
                          {answer}
                        </p>
                        {faq.link_href && (
                          <Link
                            href={`/${lang}${faq.link_href}`}
                            className="inline-block mt-3 font-body text-sm font-semibold tracking-[0.12em] text-accent hover:text-accent-dark transition-colors duration-200"
                          >
                            {lang === "he" ? faq.link_text_he : faq.link_text_en}
                          </Link>
                        )}
                      </div>
                    )}
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
