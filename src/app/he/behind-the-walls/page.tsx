"use client";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "מאחורי הקירות | בניין איתן",
  description: "לקוחות הפרויקט מקבלים הצצה לסטנדרטים שלנו בתכנון התשתיות ובדיוק ההנדסי.",
  robots: "noindex, nofollow",
};

const HeBehindTheWallsClient = dynamic(() => import("../../components/ClientLayouts/HeBehindTheWallsClient"), { ssr: false });

export default function BehindTheWallsHE() {
  return <HeBehindTheWallsClient />;
}

export default function BehindTheWallsHE() {
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
        <motion.p
          className="text-lg text-charcoal/80 mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          המחויבות שלנו חורגת ממה שנראה על פני השטח. כל קורה, צינור וצינור
          הם חלק ממערכת מתוכננת ביעילות וביציבות.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <motion.h2 className="text-2xl font-semibold text-charcoal mb-4">
              תשתיות וגיבוי
            </motion.h2>
            <motion.p
              className="text-base text-charcoal/80 mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              אנו מתכננים מראש את כל מערכות החשמל, המים והמיזוג. אנו מציעים תכנון תשתיות
              עם אפשרות לגיבוי, כך שמערכות קריטיות לא תיפגענה והשקט שלכם יישמר.
            </motion.p>

            <motion.h2 className="text-2xl font-semibold text-charcoal mb-4">
              דיוק הנדסי מוחלט
            </motion.h2>
            <motion.p
              className="text-base text-charcoal/80"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              הצוותים שלנו עובדים בדיוק מילימטרי ועם סובלנות שניתן לסמוך עליה. רמת
              הדיוק הזו הופכת עיצובים מורכבים למציאות ללא רבב.
            </motion.p>
          </div>
          <div>
            <motion.p
              className="text-base text-charcoal/80"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              בין אם אתם בונים וילה יוקרתית או מבנה מסחרי, אנו מתחילים מהבלתי
              נראה ובונים החוצה. זה מה שמאחורי הקירות באמת עבורנו.
            </motion.p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
