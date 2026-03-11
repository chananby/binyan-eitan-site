"use client";

import { useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useLang } from "./LangContext";
import { useTranslationsRaw } from "./TranslationsProvider";
import SectionReveal from "./SectionReveal";

interface Testimonial {
  id: string;
  name: string;
  city_he?: string;
  city_en?: string;
  text_he: string;
  text_en: string;
  rating: number;
  year?: string;
  source?: string;
}

const DEFAULT_UI = {
  en: {
    overline: "Client Testimonials",
    heading: "What Our\nClients Say.",
    sub: "Real feedback from homeowners, architects, and institutions.",
    google_rating_text: "Rated 5.0 (18 Reviews on Google)",
    read_more_google: "Read all reviews on Google",
    google_url: "#",
  },
  he: {
    overline: "עדויות לקוחות",
    heading: "מה אומרים\nהלקוחות שלנו.",
    sub: "פידבק אמיתי מבעלי בתים, אדריכלים ומוסדות שסמכו עלינו.",
    google_rating_text: "ציון 5.0 (18 ביקורות בגוגל)",
    read_more_google: "לכל הביקורות ב-Google",
    google_url: "#",
  },
} as const;

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width={size}
          height={size}
          viewBox="0 0 14 14"
          fill={s <= rating ? "#8D775F" : "none"}
          stroke="#8D775F"
          strokeWidth={1.2}
          className="shrink-0"
          aria-hidden="true"
        >
          <path d="M7 1l1.545 3.13L12 4.635l-2.5 2.435.59 3.43L7 8.885l-3.09 1.615.59-3.43L2 4.635l3.455-.505z" />
        </svg>
      ))}
    </div>
  );
}

function GoogleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function TestimonialCard({
  t,
  lang,
}: {
  t: Testimonial;
  lang: "en" | "he";
}) {
  const text = lang === "he" ? t.text_he : t.text_en;
  const city = lang === "he" ? t.city_he : t.city_en;
  return (
    <div className="flex flex-col bg-white border border-warm-gray-light p-7 shadow-sm h-full">
      <div className="mb-4">
        <StarRating rating={t.rating ?? 5} />
      </div>
      <blockquote className="flex-1 font-body text-[0.9375rem] text-charcoal/80 leading-relaxed mb-6">
        &ldquo;{text}&rdquo;
      </blockquote>
      <div className="flex items-end justify-between gap-3 pt-5 border-t border-warm-gray-light">
        <div>
          <p className="font-heading text-sm font-bold text-charcoal leading-tight">{t.name}</p>
          {city && (
            <p className="font-body text-xs text-charcoal/40 mt-0.5">{city}</p>
          )}
        </div>
        {t.source === "Google" && (
          <div className="shrink-0 inline-flex items-center gap-1.5 text-charcoal/30">
            <GoogleIcon size={14} />
            <span className="font-body text-[10px] font-semibold tracking-wide">Google</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileCarousel({
  testimonials,
  lang,
  dir,
}: {
  testimonials: Testimonial[];
  lang: "en" | "he";
  dir: "ltr" | "rtl";
}) {
  const [current, setCurrent] = useState(0);
  const total = testimonials.length;
  const isRtl = dir === "rtl";

  function advance(delta: number) {
    setCurrent((c) => Math.min(Math.max(c + delta, 0), total - 1));
  }

  function onDragEnd(_: PointerEvent, info: PanInfo) {
    const SWIPE_THRESHOLD = 50;
    const { offset } = info;
    // RTL swipe: left = next in LTR → previous in RTL
    const raw = isRtl ? -offset.x : offset.x;
    if (raw < -SWIPE_THRESHOLD) advance(1);
    else if (raw > SWIPE_THRESHOLD) advance(-1);
  }

  // x% offset: in LTR slide left, in RTL slide right
  const xPercent = isRtl ? current * 100 : -current * 100;

  return (
    <div>
      {/* Track */}
      <div className="overflow-hidden cursor-grab active:cursor-grabbing select-none">
        <motion.div
          className="flex"
          animate={{ x: `${xPercent}%` }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={onDragEnd}
        >
          {testimonials.map((t) => (
            <div key={t.id} className="min-w-full px-1">
              <TestimonialCard t={t} lang={lang} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Pagination dots */}
      <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Testimonial slides">
        {testimonials.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Go to testimonial ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 bg-accent"
                : "w-1.5 bg-charcoal/20 hover:bg-charcoal/40"
            }`}
          />
        ))}
      </div>

      {/* Counter */}
      <p className="mt-3 text-center font-body text-xs text-charcoal/40">
        {current + 1} / {total}
      </p>
    </div>
  );
}

export default function Testimonials() {
  type Lang = "en" | "he";
  const { lang } = useLang() as { lang: Lang };
  const dir = lang === "he" ? "rtl" : "ltr";

  const rawData = useTranslationsRaw() as Record<string, any>;

  const testimonials: Testimonial[] =
    Array.isArray(rawData?.testimonials) && rawData.testimonials.length > 0
      ? rawData.testimonials
      : [];

  const d = DEFAULT_UI[lang];
  const h = rawData?.home?.[lang] ?? {};
  const labels = {
    overline:           h.testimonials_overline  || d.overline,
    heading:            h.testimonials_heading   || d.heading,
    sub:                h.testimonials_sub       || d.sub,
    google_rating_text: h.google_rating_text     || d.google_rating_text,
    read_more_google:   h.read_more_google       || d.read_more_google,
    google_url:         h.testimonials_google_url || d.google_url,
  };

  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="bg-bone py-24 md:py-32" dir={dir}>
      <div className="mx-auto max-w-[1280px] px-8">

        {/* ── Section header ── */}
        <SectionReveal>
          <div className="mb-14">
            <p className="overline-label mb-5 flex items-center gap-3">
              <span className="inline-block h-px w-6 bg-accent" />
              {labels.overline}
            </p>
            <h2 className="font-heading text-3xl font-bold leading-tight text-charcoal md:text-4xl lg:text-5xl whitespace-pre-line">
              {labels.heading}
            </h2>
            <p className="mt-4 max-w-xl font-body text-base text-charcoal/60 leading-relaxed">
              {labels.sub}
            </p>

            {/* Aggregate rating chip */}
            <div className="mt-8 inline-flex items-center gap-3 bg-white border border-warm-gray-light px-5 py-3 shadow-sm rounded-lg">
              <GoogleIcon size={18} />
              <StarRating rating={5} size={16} />
              <span className="h-4 w-px bg-warm-gray-light mx-1" aria-hidden="true" />
              <span className="font-body text-sm text-charcoal/60 leading-none">
                {labels.google_rating_text}
              </span>
            </div>
          </div>
        </SectionReveal>

        {/* ── Mobile: Carousel ── */}
        <div className="md:hidden">
          <MobileCarousel testimonials={testimonials} lang={lang} dir={dir} />
        </div>

        {/* ── Desktop: Grid ── */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="hover:shadow-md transition-shadow duration-300"
            >
              <TestimonialCard t={t} lang={lang} />
            </motion.div>
          ))}
        </div>

        {/* ── Google CTA ── */}
        {labels.google_url && labels.google_url !== "#" && (
          <SectionReveal>
            <div className="mt-12 flex justify-center">
              <a
                href={labels.google_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 border border-accent text-accent px-7 py-3 text-sm font-semibold tracking-wide hover:bg-accent hover:text-bone transition-colors duration-300"
              >
                <GoogleIcon size={16} />
                {labels.read_more_google}
              </a>
            </div>
          </SectionReveal>
        )}

      </div>
    </section>
  );
}
