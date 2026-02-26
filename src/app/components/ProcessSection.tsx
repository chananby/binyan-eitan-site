"use client";

import { motion } from "framer-motion";
import { useLang } from "./LangContext";

const content = {
  en: {
    overline: "The Process",
    title: "4 Phases of Execution",
    phases: [
      { label: "Audit", desc: "Site evaluation, planning, permit management." },
      { label: "Structural", desc: "Engineering, foundations, steel, concrete." },
      { label: "Finishing", desc: "Luxury interiors, systems, and details." },
      { label: "Handover", desc: "Final inspection, documentation, and delivery." },
    ],
  },
  he: {
    overline: "התהליך",
    title: "4 שלבי ביצוע",
    phases: [
      { label: "בדיקה", desc: "הערכת אתר, תכנון, טיפול רישוי." },
      { label: "קונסטרוקציה", desc: "הנדסה, יסודות, פלדה ובטון." },
      { label: "גימור", desc: "פנימיות יוקרתיות, מערכות ופרטים." },
      { label: "מסירה", desc: "בדיקה אחרונה, תיעוד, והעברה." },
    ],
  },
} as const;

export default function ProcessSection() {
  const { lang } = useLang();
  const c = content[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  return (
    <section className="bg-bone py-24" dir={dir}>
      <div className="mx-auto max-w-[1440px] px-8">
        <motion.p
          className="overline-label mb-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {c.overline}
        </motion.p>
        <motion.h2
          className="font-heading text-3xl font-bold text-charcoal mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {c.title}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {c.phases.map((phase, idx) => (
            <motion.div
              key={idx}
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              viewport={{ once: true }}
            >
              <p className="font-body text-sm font-semibold uppercase text-accent">
                {phase.label}
              </p>
              <p className="font-body text-base text-charcoal/80">
                {phase.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
