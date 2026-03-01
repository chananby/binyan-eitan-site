"use client";

import Link from "next/link";
import Image from "next/image";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";

type Lang = "en" | "he";

const WHATSAPP_HE =
  "https://wa.me/972585008447?text=%D7%94%D7%99%D7%99%20%D7%9E%D7%95%D7%98%D7%99%2C%20%D7%94%D7%92%D7%A2%D7%AA%D7%99%20%D7%94%D7%99%D7%99%20%D7%93%D7%A8%D7%9A%20%D7%94%D7%90%D7%AA%D7%A8%20%D7%95%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%94%D7%AA%D7%99%D7%99%D7%A2%D7%A5%20%D7%9C%D7%92%D7%91%D7%99%20%D7%A4%D7%A8%D7%95%D7%99%D7%A7%D7%98...";
const WHATSAPP_EN =
  "https://wa.me/972585008447?text=Hi%20Moti%2C%20I%20reached%20out%20via%20the%20website%20and%20would%20like%20to%20consult%20regarding%20a%20project...";

const NAV_LABELS = {
  en: [
    { label: "Home", href: (lang: string) => `/${lang}` },
    { label: "The Firm", href: (lang: string) => `/${lang}/about` },
    { label: "Expertise", href: (lang: string) => `/${lang}/expertise` },
    { label: "FAQ", href: (lang: string) => `/${lang}/expertise#faq` },
    { label: "Portfolio", href: (lang: string) => `/${lang}#portfolio` },
  ],
  he: [
    { label: "דף הבית", href: (lang: string) => `/${lang}` },
    { label: "החברה", href: (lang: string) => `/${lang}/about` },
    { label: "מומחיות", href: (lang: string) => `/${lang}/expertise` },
    { label: 'שו"ת', href: (lang: string) => `/${lang}/expertise#faq` },
    { label: "תיק פרויקטים", href: (lang: string) => `/${lang}#portfolio` },
  ],
} as const;

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function Footer() {
  const { lang } = useLang() as { lang: Lang };
  const content = useTranslations("footer", lang);
  const whatsappUrl = lang === "he" ? WHATSAPP_HE : WHATSAPP_EN;
  const dir = lang === "he" ? "rtl" : "ltr";
  const navItems = NAV_LABELS[lang];

  return (
    <footer className="bg-charcoal text-bone" dir={dir}>
      {/* Main grid */}
      <div className="max-w-[1280px] mx-auto px-8 pt-16 pb-10 md:pt-20 md:pb-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">

          {/* ── Column 1: Brand ── */}
          <div className="md:col-span-5">
            <div className="mb-6 opacity-90 brightness-0 invert">
              <Image
                src="/logo.png"
                alt="Binyan Eitan"
                width={160}
                height={45}
                className="h-10 w-auto"
              />
            </div>

            {/* G1 badge */}
            <div className="mb-5 inline-flex items-center gap-2 border border-accent/40 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
              <span className="font-body text-[0.62rem] font-semibold tracking-[0.2em] uppercase text-accent/90">
                {lang === "he"
                  ? "קבלן רשום ג1 — רישיון מס׳ 41805"
                  : "Registered Contractor G1 — License #41805"}
              </span>
            </div>

            <p className="font-body text-sm text-bone/55 leading-relaxed max-w-xs">
              {lang === "he"
                ? "בנין איתן מחויבת למצוינות הנדסית, עמידה בלוחות זמנים ואיכות ביצוע ללא פשרות."
                : "Binyan Eitan is committed to engineering excellence, schedule adherence, and uncompromising construction quality."}
            </p>
          </div>

          {/* ── Column 2: Navigation ── */}
          <div className="md:col-span-3 md:col-start-7">
            <h4 className="font-body text-[0.65rem] font-bold tracking-[0.22em] uppercase text-bone/40 mb-6">
              {lang === "he" ? "ניווט" : "Navigation"}
            </h4>
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href(lang)}
                    className="font-body text-sm text-bone/65 hover:text-accent transition-colors duration-200 block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 3: Contact ── */}
          <div className="md:col-span-4 md:col-start-10">
            <h4 className="font-body text-[0.65rem] font-bold tracking-[0.22em] uppercase text-bone/40 mb-6">
              {content.contactHeading}
            </h4>
            <ul className="space-y-3 font-body text-sm text-bone/65">
              <li className="leading-snug">{content.address}</li>
              <li>
                <a
                  href={`tel:${content.officePhoneTel}`}
                  className="hover:text-accent transition-colors duration-200"
                >
                  <bdi>{content.officePhone}</bdi>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${content.email}`}
                  className="hover:text-accent transition-colors duration-200 break-all"
                >
                  {content.email}
                </a>
              </li>
              <li className="pt-1">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-accent/[0.12] hover:bg-accent/20 border border-accent/25 text-accent px-4 py-2 transition-colors duration-200 text-xs font-semibold tracking-[0.12em] uppercase"
                >
                  <WhatsAppIcon />
                  {lang === "he" ? "שלחו הודעה" : "WhatsApp Us"}
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-bone/[0.08]">
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="font-body text-[0.62rem] tracking-wider text-bone/25">
            &copy; {new Date().getFullYear()} Binyan Eitan.{" "}
            {lang === "he" ? "כל הזכויות שמורות." : "All rights reserved."}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {[
              { label: content.termsOfUse },
              { label: content.privacyPolicy },
              { label: content.accessibility },
            ].map((item) => (
              <Link
                key={item.label}
                href={`/${lang}/legal`}
                className="font-body text-[0.6rem] tracking-[0.14em] uppercase text-bone/30 hover:text-accent transition-colors duration-200"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
