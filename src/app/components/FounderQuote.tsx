"use client";

import { useTranslations } from "./TranslationsProvider";
import { useLang } from "./LangContext";
import SectionReveal from "./SectionReveal";

export default function FounderQuote() {
  const lang = useLang();
  const t = useTranslations("about", lang);

  const quote: string = (t as Record<string, string>).founderQuote ?? "";
  const name: string  = (t as Record<string, string>).founderName  ?? (lang === "he" ? "מוטי איתן" : "Motti Eitan");
  const title: string = (t as Record<string, string>).founderTitle ?? (lang === "he" ? "מייסד ומנכ\"ל, בנין איתן" : "Founder & CEO, Binyan Eitan");

  if (!quote) return null;

  return (
    <section className="bg-charcoal py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-6 md:px-10">
        <SectionReveal>
          <figure className="flex flex-col items-center text-center gap-6">
            {/* Decorative open-quote mark */}
            <span
              className="block font-heading text-7xl md:text-8xl leading-none text-accent/40 select-none"
              aria-hidden="true"
            >
              &ldquo;
            </span>

            <blockquote className="font-heading text-xl md:text-2xl lg:text-3xl font-semibold text-bone leading-snug tracking-wide max-w-3xl">
              {quote}
            </blockquote>

            <figcaption className="flex flex-col items-center gap-1 pt-2">
              {/* Thin divider */}
              <span className="block w-10 h-px bg-accent/50 mb-3" />
              <span className="font-heading text-bone font-bold text-base tracking-widest uppercase">
                {name}
              </span>
              <span className="font-body text-warm-gray-light/70 text-sm tracking-wider">
                {title}
              </span>
            </figcaption>
          </figure>
        </SectionReveal>
      </div>
    </section>
  );
}
