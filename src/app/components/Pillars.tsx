"use client";
 
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Crosshair, Clock, Users } from "lucide-react";
import { useLang } from "./LangContext";
 
/* ── Pillar data ── */
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
      summary: "מילה שלנו היא החוזה החזק ביותר.",
      body: "אנחנו לא מבטיחים מה שאנחנו לא יכולים לספק. כל התחייבות שאנחנו נותנים מגובה בניסיון של עשרות שנים, בצוות קבוע ומיומן ובמוניטין שנבנה פרויקט אחר פרויקט. כשבנין איתן אומרים — זה קורה.",
    },
    en: {
      title: "Reliability",
      summary: "Our word is the strongest contract.",
      body: "We never promise what we can't deliver. Every commitment is backed by decades of experience, a permanent skilled team, and a reputation built project after project. When Binyan Eitan says it — it happens.",
    },
  },
  {
    id: "precision",
    num: "02",
    icon: Crosshair,
    he: {
      title: "דיוק",
      summary: "השטן נמצא בפרטים — ואנחנו שולטים בכל פרט.",
      body: "מהתכנון ההנדסי הראשוני ועד לגימור הסופי, כל מילימטר חשוב. אנחנו עובדים עם סטנדרטים של דיוק שמאפיינים הנדסה ברמה הגבוהה ביותר — בלי קיצורי דרך, בלי פשרות.",
    },
    en: {
      title: "Precision",
      summary: "The devil is in the details — and we master every one.",
      body: "From initial engineering design to final finish, every millimeter counts. We work to precision standards that define the highest level of engineering — no shortcuts, no compromises.",
    },
  },
  {
    id: "timeline",
    num: "03",
    icon: Clock,
    he: {
      title: "לוחות זמנים",
      summary: "הזמן שלכם שווה לא פחות מהאיכות שלנו.",
      body: "ניהול לוחות זמנים הוא לא רק עניין של יעילות — זו שאלה של כבוד. אנחנו מתכננים כל שלב מראש, מנהלים תלויות בצורה חכמה ומתחייבים למועדים שנקבעו. איחורים הם לא חלק מהתרבות שלנו.",
    },
    en: {
      title: "Timeline Integrity",
      summary: "Your time is worth no less than our quality.",
      body: "Timeline management isn't just about efficiency — it's about respect. We plan every phase in advance, manage dependencies intelligently, and commit to agreed-upon deadlines. Delays are not part of our culture.",
    },
  },
  {
    id: "partnership",
    num: "04",
    icon: Users,
    he: {
      title: "שותפות",
      summary: "אנחנו לא קבלנים — אנחנו שותפים לדרך.",
      body: "מהרגע הראשון ועד למסירת המפתח, אתם חלק מהתהליך. שקיפות מלאה, תקשורת רציפה, והקשבה אמיתית לצרכים שלכם. אנחנו מאמינים שהפרויקטים הטובים ביותר נבנים יחד.",
    },
    en: {
      title: "Client Partnership",
      summary: "We're not contractors — we're partners on the journey.",
      body: "From day one to key handover, you're part of the process. Full transparency, continuous communication, and genuine attention to your needs. We believe the best projects are built together.",
    },
  },
];
 
const copy = {
  he: {
    overline: "עמודי התווך",
    heading: "הערכים שמנחים\nכל פרויקט.",
  },
  en: {
    overline: "Pillars of Trust",
    heading: "The Values That\nGuide Every Project.",
  },
} as const;
 
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
 
/* ═════════════════════════════════════════════════════════
   PILLARS OF TRUST SECTION
   Accordion-reveal with architectural numbering
   ═════════════════════════════════════════════════════════ */
export default function Pillars() {
  const { lang } = useLang();
  const { overline, heading } = copy[lang];
  const [openId, setOpenId] = useState<string>(pillars[0].id);
 
  return (
    <section className="relative bg-bone-dark py-28 md:py-36">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* ── Section header — 12-col editorial layout ── */}
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
          {/* Ghosted number — trailing side */}
          <div className="hidden items-start justify-end md:col-span-2 md:col-start-11 md:flex">
            <AnimatePresence mode="wait">
              <motion.span
                key={openId}
                className="font-heading text-[10rem] leading-none font-bold text-charcoal/[0.04]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease }}
              >
                {pillars.find((p) => p.id === openId)?.num}
              </motion.span>
            </AnimatePresence>
          </div>
 
          {/* Accordion items */}
          <div className="col-span-4 md:col-span-8 md:col-start-1 md:row-start-1">
            {pillars.map((pillar) => {
              const isOpen = openId === pillar.id;
              const content = pillar[lang];
              const Icon = pillar.icon;
 
              return (
                <div key={pillar.id} className="border-b border-charcoal/[0.07] last:border-b-0">
                  {/* ── Accordion trigger ── */}
                  <button
                    onClick={() => setOpenId(isOpen ? "" : pillar.id)}
                    className="group flex w-full items-center gap-5 py-7 text-start md:gap-8 md:py-9"
                    aria-expanded={isOpen}
                  >
                    {/* Number */}
                    <span
                      className={`shrink-0 font-heading text-2xl font-bold transition-colors duration-500 md:text-3xl ${
                        isOpen ? "text-accent" : "text-charcoal/15 group-hover:text-charcoal/30"
                      }`}
                    >
                      {pillar.num}
                    </span>
 
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
 
                    {/* Expand indicator */}
                    <motion.span
                      className="ms-auto shrink-0 text-charcoal/25"
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.4, ease }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
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
                        <div className="pb-9 ps-[4.25rem] md:ps-[7.5rem]">
                          {/* Summary — visible on mobile */}
                          <p className="mb-3 font-body text-sm font-medium text-charcoal/70 md:hidden">
                            {content.summary}
                          </p>
 
                          <p className="max-w-2xl font-body text-base leading-relaxed font-light text-charcoal/55 md:text-lg">
                            {content.body}
                          </p>
 
                          {/* Accent bar */}
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
