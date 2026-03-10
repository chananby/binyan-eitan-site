"use client";

import { motion } from "framer-motion";
import { useLang } from "./LangContext";

const content = {
  en: {
    overline: "The Process",
    title: "4 Phases of Execution",
    phases: [
      {
        label: "Planning, Estimation & Coordination",
        desc: "Infrastructure assessment, detailed cost estimation, and consolidation of plans and permits. We create a professional roadmap for efficient execution, ensuring transparency and minimizing unforeseen issues.",
      },
      {
        label: "Infrastructure, Structure & Systems",
        desc: "Electrical, plumbing, HVAC, and structural reinforcements. We build the core—the part you don't see, but is most crucial for longevity—with zero compromises and long-term reliability.",
      },
      {
        label: "Finishes & Luxury Craftsmanship",
        desc: "Precision tiling, meticulous painting, and installation of premium materials. This is where your vision comes to life with high-end quality, down to the very last finishing detail.",
      },
      {
        label: "Quality Control & Handover",
        desc: "Thorough testing of every outlet and fixture before completion. Site cleanup, delivery of an organized project file, and handing over the keys to a 100% move-in-ready home.",
      },
    ],
  },
  he: {
    overline: "התהליך",
    title: "4 שלבי ביצוע",
    phases: [
      {
        label: "תכנון, אומדן וסנכרון",
        desc: "בדיקת תשתיות, בניית אומדן מפורט וריכוז תוכניות ואישורים. אנחנו בונים מפת דרכים מקצועית לביצוע יעיל, בשקיפות מלאה ובשאיפה למינימום הפתעות במהלך העבודה.",
      },
      {
        label: "תשתיות, שלד ומערכות",
        desc: "חשמל, אינסטלציה, מיזוג וחיזוקים הנדסיים. כאן אנחנו בונים את הליבה שלא רואים אחר כך, אבל הכי חשוב שתחזיק לשנים – בלי תקלות ובלי פשרות.",
      },
      {
        label: "עבודות גמר ויוקרה",
        desc: "ריצוף מדויק, עבודות צבע מוקפדות והתקנת חומרים בסטנדרט הגבוה ביותר. כאן הבית מקבל את המראה והאיכות שחלמתם עליהם, עד לרמת הגימור של הבורג האחרון.",
      },
      {
        label: "בקרת איכות ומסירה",
        desc: "בדיקה יסודית של כל שקע וברז לפני היציאה מהשטח. ניקיון האתר, מסירת תיק פרויקט מסודר ומסירת מפתח לבית שמוכן למגורים ב-100% בראש שקט.",
      },
    ],
  },
} as const;

type Lang = "en" | "he";

export default function ProcessSection() {
  const { lang } = useLang() as { lang: Lang };
  const c = content[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  return (
    <section className="bg-bone py-14 md:py-24" dir={dir}>
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

        {/* vertical timeline container */}
        <div className="relative ps-8">
          {/* connecting line */}
          <div className="absolute start-2 top-0 bottom-0 w-px bg-accent/30" />

          {c.phases.map((phase: { label: string; desc: string }, idx: number) => (
            <motion.div
              key={idx}
              className="group relative mb-12 ps-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              viewport={{ once: true }}
            >
              {/* circle */}
              <div className="absolute start-0 top-1">
                <span className="block w-4 h-4 rounded-full bg-[#8D775F] transition-transform group-hover:scale-110" />
              </div>

              <p className="font-body text-sm font-semibold uppercase text-charcoal group-hover:text-accent">
                {phase.label}
              </p>
              <p className="mt-2 font-body text-base text-charcoal/80">
                {phase.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
