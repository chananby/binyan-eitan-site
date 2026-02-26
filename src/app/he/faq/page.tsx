import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { motion } from "framer-motion";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "שאלות נפוצות | בניין איתן",
  description: "שאלות נפוצות לגבי שירותי הבנייה שלנו.",
  robots: "noindex, nofollow",
};

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
          <div className="space-y-6">
            {faqs.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + idx * 0.1 }}
              >
                <p className="font-semibold text-charcoal">{item.q}</p>
                <p className="mt-2 text-charcoal/80">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
