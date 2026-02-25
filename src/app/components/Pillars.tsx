"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Crosshair, Clock, Users } from "lucide-react";
import { useLang } from "./LangContext";

/* ── Pillar data (הטקסטים המדויקים שלנו) ── */
interface Pillar {
  id: string;
  num: string;
  icon: React.ElementType;
  he: { title: string; summary: string; body: string };
  en: { title: string; summary: string; body: string };
}

const pillars: Pillar[] = [
  {
    id: "reliability",
    num: "01",
    icon: Shield,
    he: {
      title: "אמינות",
      summary: "מחויבות מוחלטת לשקיפות מלאה ולסטנדרטים מחמירים.",
      body: "מחויבות מוחלטת לשקיפות מלאה ולסטנדרטים מחמירים.",
    },
    en: {
      title: "Reliability",
      summary: "Our word is an engineering promise.",
      body: "In construction, trust is the most valuable asset. We operate with full transparency, no 'surprises,' and no excuses, out of total commitment to the result and the client.",
    },
  },
  {
    id: "precision",
    num: "02",
    icon: Crosshair,
    he: {
      title: "דיוק הנדסי",
      summary: "תכנון וביצוע ברזולוציה הגבוהה ביותר, ללא עיגולי פינות.",
      body: "תכנון וביצוע ברזולוציה הגבוהה ביותר, ללא עיגולי פינות.",
    },
    en: {
      title: "Engineering Precision",
      summary: "Mastering the smallest details.",
      body: "We don't cut corners. Every joint, pour, and finish is executed to the highest standard, ensuring meticulous pre-planning and uncompromising on-site execution.",
    },
  },
  {
    id: "timeline",
    num: "03",
    icon: Clock,
    he: {
      title: "עמידה בזמנים",
      summary: "ניהול פרויקטים דינמי ומקצועי המבטיח מסירה בזמן.",
      body: "ניהול פרויקטים דינמי ומקצועי המבטיח מסירה בזמן, ללא פשרות על האיכות.",
    },
    en: {
      title: "Timeline Integrity",
      summary: "Time management is a matter of respect.",
      body: "Your time is valuable. Project management is conducted according to realistic and strict schedules, understanding that punctuality is an inseparable part of quality.",
    },
  },
  {
    id: "partnership",
    num: "04",
    icon: Users,
    he: {
      title: "שותפות",
      summary: "אתכם לאורך כל הדרך.",
      body: "אנחנו לא רק הקבלן שלכם, אנחנו השותפים שלכם למסע. שקיפות, תקשורת רציפה והקשבה לצרכים שלכם הם הבסיס לכל פרויקט מוצלח.",
    },
    en: {
      title: "Partnership",
      summary: "With you all the way.",
      body: "We are not just your contractor; we are your partners on the journey. Transparency, continuous communication, and listening to your needs are the foundation of every successful project.",
    },
  },
];

const copy = {
  he: {
    overline: "סטנדרט של מצוינות",
    heading: "הערכים שמנחים\nכל פרויקט.",
  },
  en: {
    overline: "Standard of Excellence",
    heading: "The Values That\nGuide Every Project.",
  },
} as const;

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ═════════════════════════════════════════════════════════
   PILLARS OF TRUST SECTION (הגרסה העשירה והמלאה)
   ═════════════════════════════════════════════════════════ */
export default function Pillars() {
  const { lang } = useLang();
  const { overline, heading } = copy[lang];
  const [openId, setOpenId] = useState<string>(pillars[0].id);

  return (
    <section className="relative bg-bone-dark py-36 md:py-48 text-start">
      <div className="mx-auto max-w-7xl px-6">
        {/* ── Section header ── */}
        <div className="mb-16 grid grid-cols-4 gap-x-4 md:mb-24 md:grid-cols-12 md:gap-x-6">
          <div className="col-span-4 md:col-span-3 md:col-start-1">
            <p className="overline-label">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              {overline}
            </p>
          </div>
          <div className="col-span-4 mt-6 md:col-span-7 md:col-start-4 md:mt-0">
            <h2 className="font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
              {heading.split("\n").map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h2>
          </div>
        </div>

        {/* ── Accordion grid ── */}
        <div className="grid grid-cols-4 gap-x-4 md:grid-cols-12 md:gap-x-6">
          {/* Accordion items */}
          <div className="col-span-4 md:col-span-10 md:col-start-1">
            {pillars.map((pillar) => {
              const isOpen = openId === pillar.id;
              const content = pillar[lang];
              const Icon = pillar.icon;

              return (
                <div key={pillar.id} className="border-b border-charcoal/[0.07] last:border-b-0">
                  {/* ── Accordion trigger ── */}
                  <button
                    onClick={() => setOpenId(isOpen ? "" : pillar.id)}
                    className="group flex w-full items-center gap-5 py-7 text-start md:gap-8 md:py-9 focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    {/* Icon */}
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full border transition-all duration-500 md:size-12 ${
                        isOpen
                          ? "border-accent/30 bg-accent/[0.08] text-accent"
                          : "border-charcoal/[0.07] text-charcoal/30 group-hover:border-charcoal/15 group-hover:text-charcoal/50"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.5} />
                    </span>

                    {/* Title + summary */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`font-heading text-xl font-bold transition-colors duration-500 md:text-2xl ${
                          isOpen ? "text-charcoal" : "text-charcoal/60 group-hover:text-charcoal/80"
                        }`}
                      >
                        {content.title}
                      </h3>
                      <p className="mt-1 font-body text-sm font-light text-charcoal/40 max-md:hidden">
                        {content.summary}
                      </p>
                    </div>

                    {/* Expand indicator (החץ שזז) */}
                    <motion.span
                      className="ms-auto shrink-0 text-charcoal/25"
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.4, ease }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="10" y1="4" x2="10" y2="16" />
                        <line x1="4" y1="10" x2="16" y2="10" />
                      </svg>
                    </motion.span>
                  </button>

                  {/* ── Accordion panel ── */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease }}
                        className="overflow-hidden"
                      >
                        <div className="pb-9 ps-[3.5rem] md:ps-[4.5rem]">
                          {/* Summary — visible on mobile */}
                          <p className="mb-3 font-body text-sm font-medium text-charcoal/70 md:hidden">
                            {content.summary}
                          </p>

                          <p className="max-w-2xl font-body text-base leading-relaxed font-light text-charcoal/55 md:text-lg">
                            {content.body}
                          </p>

                          {/* Accent bar (הפס המוזהב שנפתח) */}
                          <motion.div
                            className="mt-6 h-px bg-accent/30"
                            initial={{ width: 0 }}
                            animate={{ width: 48 }}
                            transition={{ duration: 0.6, delay: 0.15, ease }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
