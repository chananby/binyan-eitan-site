"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export interface Pillar {
  num: string;
  title: string;
  desc: string;
}

export interface LPData {
  dir: "ltr" | "rtl";
  heroImage: string;
  heroImageAlt: string;
  breakImage: string;
  badge: string;
  headingLine1: string;
  headingAccent: string;
  heroSub: string;
  heroCta: string;
  trustBar: { value: string; label: string }[];
  introLabel: string;
  introText: string;
  pillarsTitle: string;
  pillars: Pillar[];
  breakQuote: string;
  ctaLabel: string;
  ctaTitle: string;
  ctaDesc: string;
  ctaBtn: string;
  ctaNote: string;
  phoneTel: string;
  footerLegal: string;
  mainSiteHref: string;
  mainSiteLabel: string;
  whatsappUrl: string;
}

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function LPTemplate({ d }: { d: LPData }) {
  const isRtl = d.dir === "rtl";

  return (
    <div className="min-h-screen bg-bone text-charcoal font-body" dir={d.dir}>

      {/* ── Sticky Header ── */}
      <header className="fixed inset-x-0 top-0 z-50 bg-bone/96 backdrop-blur-md border-b border-charcoal/[0.07]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href={d.mainSiteHref}>
            <Image
              src="/logo.png"
              alt="Binyan Eitan"
              width={130}
              height={38}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <a
            href={d.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-accent text-bone px-5 py-2.5 font-body text-[11px] font-semibold tracking-[0.18em] uppercase hover:bg-accent-dark transition-colors duration-300"
          >
            <WhatsAppIcon size={13} />
            {d.heroCta}
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-svh flex items-center justify-center overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0">
          <Image
            src={d.heroImage}
            alt={d.heroImageAlt}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-charcoal/62" />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/20 via-transparent to-charcoal/55" />
        </div>

        {/* Architectural grid lines */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-y-0 start-[8.33%] w-px bg-bone/[0.04]" />
          <div className="absolute inset-y-0 end-[8.33%] w-px bg-bone/[0.04]" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-8 text-center">
          <motion.p
            className="mb-6 font-body text-[0.62rem] font-semibold tracking-[0.42em] uppercase text-accent"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <span className="me-3 inline-block h-px w-8 bg-accent align-middle" />
            {d.badge}
            <span className="ms-3 inline-block h-px w-8 bg-accent align-middle" />
          </motion.p>

          <motion.h1
            className="font-heading font-bold leading-[1.1] tracking-tight text-bone"
            style={{ fontSize: "clamp(2.2rem, 5.5vw, 5.2rem)" }}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.08, ease }}
          >
            {d.headingLine1}
            {d.headingAccent && (
              <>
                <br />
                <span className="text-accent">{d.headingAccent}</span>
              </>
            )}
          </motion.h1>

          <motion.p
            className="mt-8 mx-auto max-w-xl font-body text-[1.05rem] text-bone/65 leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.18, ease }}
          >
            {d.heroSub}
          </motion.p>

          <motion.a
            href={d.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center gap-3 bg-accent text-bone px-10 py-5 font-body text-sm font-bold tracking-[0.22em] uppercase hover:bg-accent-dark transition-all duration-300 hover:shadow-2xl hover:shadow-black/30"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.28, ease }}
          >
            <WhatsAppIcon size={16} />
            {d.heroCta}
          </motion.a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-3 pointer-events-none">
          <span className="font-body text-[0.5rem] tracking-[0.4em] uppercase text-bone/25">
            {isRtl ? "גלול" : "Scroll"}
          </span>
          <motion.div
            className="h-10 w-px bg-bone/15 origin-top"
            animate={{ scaleY: [0, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="bg-charcoal">
        <div className="mx-auto max-w-5xl px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-bone/[0.06]">
            {d.trustBar.map((stat) => (
              <div key={stat.label} className="bg-charcoal px-6 py-5 text-center">
                <span className="block font-heading text-2xl md:text-3xl font-extrabold text-accent leading-none">
                  {stat.value}
                </span>
                <span className="block font-body text-[0.58rem] tracking-[0.2em] uppercase text-bone/40 mt-2">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intro ── */}
      <section className="py-24 md:py-32 bg-bone">
        <div className="mx-auto max-w-[740px] px-8">
          <motion.p
            className="overline-label mb-8 text-charcoal/60"
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 16 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease }}
          >
            <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
            {d.introLabel}
          </motion.p>
          <motion.p
            className="font-body text-xl md:text-[1.35rem] text-charcoal/70 leading-[1.75]"
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 24 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.08, ease }}
          >
            {d.introText}
          </motion.p>
          {/* Accent mark */}
          <motion.div
            className="mt-10 h-px w-16 bg-accent/40"
            whileInView={{ scaleX: 1, opacity: 1 }}
            initial={{ scaleX: 0, opacity: 0 }}
            style={{ originX: isRtl ? 1 : 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
          />
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="py-24 md:py-32 bg-bone-dark">
        <div className="mx-auto max-w-[1280px] px-8">
          <motion.h2
            className="font-heading text-3xl md:text-4xl font-bold text-charcoal mb-16 text-start"
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
          >
            {d.pillarsTitle}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {d.pillars.map((p, i) => (
              <motion.div
                key={p.num}
                className="group relative bg-bone border border-warm-gray-light hover:border-accent/25 p-10 transition-all duration-500 hover:shadow-sm"
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 36 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.7, delay: i * 0.13, ease }}
              >
                {/* Watermark number */}
                <span
                  className="absolute top-6 end-6 font-heading font-extrabold text-charcoal/[0.05] group-hover:text-accent/[0.07] transition-colors duration-500 leading-none select-none"
                  style={{ fontSize: "5rem" }}
                  aria-hidden="true"
                >
                  {p.num}
                </span>
                {/* Accent top bar */}
                <div className="mb-8 h-[3px] w-10 bg-accent/50 group-hover:w-16 transition-all duration-500" />
                <h3 className="font-heading text-xl font-bold text-charcoal mb-4 leading-snug">
                  {p.title}
                </h3>
                <p className="font-body text-sm leading-[1.8] text-charcoal/70">
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Image Break with Quote ── */}
      <div className="relative h-64 md:h-[440px] overflow-hidden">
        <Image
          src={d.breakImage}
          alt="Binyan Eitan Construction"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-charcoal/58" />
        {/* Subtle grain overlay */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} aria-hidden="true" />
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <motion.div
            className="text-center"
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 24 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease }}
          >
            <span className="block font-body text-[0.58rem] tracking-[0.4em] uppercase text-accent mb-5">
              Binyan Eitan
            </span>
            <p className="font-heading font-bold text-bone/92 text-center leading-snug" style={{ fontSize: "clamp(1.5rem, 4vw, 3rem)" }}>
              &ldquo;{d.breakQuote}&rdquo;
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── CTA Section ── */}
      <section className="bg-charcoal py-28 md:py-44">
        <div className="mx-auto max-w-2xl px-8 text-center">
          <motion.p
            className="font-body text-[0.6rem] font-semibold tracking-[0.38em] uppercase text-accent mb-6"
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 12 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            {d.ctaLabel}
          </motion.p>
          <motion.h2
            className="font-heading font-bold text-bone leading-[1.1] mb-6"
            style={{ fontSize: "clamp(2.4rem, 5vw, 4.5rem)" }}
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 28 }}
            viewport={{ once: true }}
            transition={{ duration: 0.85, delay: 0.08, ease }}
          >
            {d.ctaTitle}
          </motion.h2>
          <motion.p
            className="font-body text-sm text-bone/45 mb-12 max-w-md mx-auto leading-relaxed"
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 16 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.16, ease }}
          >
            {d.ctaDesc}
          </motion.p>
          <motion.a
            href={d.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-accent text-bone px-12 py-5 font-body text-sm font-bold tracking-[0.25em] uppercase hover:bg-accent-dark transition-all duration-300 hover:shadow-2xl hover:shadow-black/40"
            whileInView={{ opacity: 1, scale: 1 }}
            initial={{ opacity: 0, scale: 0.94 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.24, ease }}
          >
            <WhatsAppIcon size={16} />
            {d.ctaBtn}
          </motion.a>
          <p className="mt-6 font-body text-[0.65rem] text-bone/25">
            {d.ctaNote}{" "}
            <a href={`tel:${d.phoneTel}`} className="hover:text-accent transition-colors duration-200">
              02-500-0447
            </a>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-charcoal border-t border-bone/[0.06] py-8">
        <div className="mx-auto max-w-7xl px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Image
            src="/logo.png"
            alt="Binyan Eitan"
            width={110}
            height={32}
            className="h-7 w-auto brightness-0 invert opacity-40"
          />
          <p className="font-body text-[0.57rem] tracking-wider text-bone/20 text-center">
            {d.footerLegal}
          </p>
          <Link
            href={d.mainSiteHref}
            className="font-body text-[0.6rem] tracking-[0.18em] uppercase text-bone/30 hover:text-accent transition-colors duration-200"
          >
            {d.mainSiteLabel}
          </Link>
        </div>
      </footer>
    </div>
  );
}
