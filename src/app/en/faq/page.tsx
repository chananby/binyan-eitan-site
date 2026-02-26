import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { motion } from "framer-motion";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | Binyan Eitan",
  description: "Frequently asked questions about our construction services.",
  robots: "noindex, nofollow",
};

const faqs = [
  {
    q: "Do you provide daily reports?",
    a: "Yes, we send detailed daily reports to keep you informed of progress.",
  },
  {
    q: "Can we schedule video calls?",
    a: "No video calls at this time; all communication is handled via report and phone.",
  },
  {
    q: "Where do you operate?",
    a: "We serve clients across all of Israel.",
  },
];

export default function FAQEnglish() {
  return (
    <main className="relative" dir="ltr">
      <Navbar />
      <section className="py-24 bg-bone">
        <div className="mx-auto max-w-3xl px-8">
          <motion.h1
            className="font-heading text-4xl font-bold text-charcoal mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Frequently Asked Questions
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
