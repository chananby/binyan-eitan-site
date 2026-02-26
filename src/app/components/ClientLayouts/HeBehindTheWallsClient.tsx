"use client";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { motion } from "framer-motion";

export default function HeBehindTheWallsClient() {
  return (
    <main className="relative bg-bone" dir="rtl">
      <Navbar />
      <section className="py-24 px-8 max-w-3xl mx-auto">
        <motion.h1
          className="font-heading text-4xl font-bold text-charcoal mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          מאחורי הקירות
        </motion.h1>
        <motion.p className="text-lg text-charcoal/80 mb-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          המחויבות שלנו חורגת ממה שנראה על פני השטח. כל קורה, צינור וצינור
          הם חלק ממערכת מתוכננת ביעילות וביציבות.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <motion.h2 className="text-2xl font-semibold text-charcoal mb-4">תשתיות וגיבוי</motion.h2>
            <motion.p className="text-base text-charcoal/80" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              ...
            </motion.p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
