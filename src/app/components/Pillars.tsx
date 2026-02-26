"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Crosshair, Clock, Users } from "lucide-react";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";

type Lang = "en" | "he";

/* ── Pillar data ── */
interface Pillar {
  id: string;
  num: string;
  icon: React.ElementType;
}

const pillars: Pillar[] = [
  { id: "reliability", num: "01", icon: Shield },
  { id: "precision", num: "02", icon: Crosshair },
  { id: "timeline", num: "03", icon: Clock },
  { id: "partnership", num: "04", icon: Users },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ═════════════════════════════════════════════════════════
   PILLARS OF TRUST SECTION (הגרסה העשירה והמלאה)
   ═════════════════════════════════════════════════════════ */
export default function Pillars() {
  const { lang } = useLang() as { lang: Lang };
  const t = useTranslations("pillars", lang);
  const tt = t as Record<string, string>;
  const [openId, setOpenId] = useState<string>(pillars[0].id);

  return (
    <section className="relative bg-bone-dark py-16 md:py-24 text-start">
      <div className="mx-auto max-w-[1440px] px-8">
        {/* ── Section header ── */}
        <div className="mb-10 grid grid-cols-4 gap-x-4 md:mb-16 md:grid-cols-12 md:gap-x-6">
          <div className="col-span-4 md:col-span-3 md:col-start-1">
            <p className="overline-label">
              <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
              {t.overline}
            </p>
          </div>
          <div className="col-span-4 mt-6 md:col-span-7 md:col-start-4 md:mt-0">
            <h2 className="font-heading text-3xl leading-snug font-bold text-charcoal md:text-4xl lg:text-5xl">
              {t.heading.split("\n").map((line: string, i: number) => (
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
            {pillars.map((pillar: Pillar, i: number) => {
              const isOpen = openId === pillar.id;
              const content = {
                title: tt[`pillar_${i}_title`] ?? "",
                summary: tt[`pillar_${i}_summary`] ?? "",
                body: tt[`pillar_${i}_body`] ?? "",
              };
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
