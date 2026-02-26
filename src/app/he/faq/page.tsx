"use client";
import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { motion } from "framer-motion";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "שאלות נפוצות | בניין איתן",
  description: "שאלות נפוצות לגבי שירותי הבנייה שלנו.",
  robots: "noindex, nofollow",
};

const HeFAQClient = dynamic(() => import("../../../components/ClientLayouts/HeFAQClient"), { ssr: false });

export default function FAQHebrew() {
  return <HeFAQClient />;
}

const faqs = [
  {
    q: "האם אתם מספקים דוחות יומיים?",
    a: "כן, אנו שולחים דוחות יומיים מפורטים לשמירה על מעקב מתמיד.",
  },
  {
    q: "האם ניתן לערוך שיחות וידאו?",
    a: "נכון לעכשיו אין שיחות וידאו; התקשורת מתבצעת באמצעות דוחות וטלפון.",
  },
  {
    q: "באילו אזורים אתם פועלים?",
    a: "אנו מספקים שירות בכל רחבי ישראל.",
  },
];

export default function FAQHebrew() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const toggle = (i: number) =>
    setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <main className="relative" dir="rtl">
      <Navbar />
      <section className="py-24 bg-bone">
        <div className="mx-auto max-w-3xl px-8">
          <motion.h1
            className="font-heading text-4xl font-bold text-charcoal mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            שאלות נפוצות
          </motion.h1>
          <div className="space-y-4">
            {faqs.map((item, idx) => (
              <div key={idx} className="border-b border-charcoal/20">
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex justify-between items-center py-4 text-start font-semibold text-charcoal"
                >
                  {item.q}
                  <span className="mr-2 transform transition-transform duration-200"
                    style={{ rotate: openIndex === idx ? '180deg' : '0deg' }}>
                    ▼
                  </span>
                </button>
                {openIndex === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pb-4 text-charcoal/80"
                  >
                    {item.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
