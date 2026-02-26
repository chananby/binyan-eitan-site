"use client";

import Link from "next/link";
import Image from "next/image";
import { useLang } from "./LangContext";

type Lang = "en" | "he";

const WHATSAPP_HE =
  "https://wa.me/972585008447?text=%D7%94%D7%99%D7%99%20%D7%9E%D7%95%D7%98%D7%99%2C%20%D7%94%D7%92%D7%A2%D7%AA%D7%99%20%D7%94%D7%99%D7%99%20%D7%93%D7%A8%D7%9A%20%D7%94%D7%90%D7%AA%D7%A8%20%D7%95%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%94%D7%AA%D7%99%D7%99%D7%A2%D7%A5%20%D7%9C%D7%92%D7%91%D7%99%20%D7%A4%D7%A8%D7%95%D7%99%D7%A7%D7%98...";
const WHATSAPP_EN =
  "https://wa.me/972585008447?text=Hi%20Moti%2C%20I%20reached%20out%20via%20the%20website%20and%20would%20like%20to%20consult%20regarding%20a%20project...";

const copy = {
  he: {
    desc: "הנדסה מעבר לפני השטח. ביצוע ללא פשרות בסטנדרט בנייה יוקרתית.",
    g1Label: "קבלן רשום ג1",
    contractorName: "בניין איתן בע\"מ",
    licenseNumber: "41805",
    classification: "ג' 1 (C1) - ענף 100",
    address: "ירושלים / לוד, ישראל",
    contactHeading: "צור קשר",
    nav: "ניווט",
    portfolio: "פרויקטים",
    about: "מי אנחנו",
    rights: "כל הזכויות שמורות לבניין איתן.",
    email: "office@binyaneitan.com",
    officePhone: "02-5000447",
    officePhoneTel: "+97225000447",
    mobile: "058-5008447",
    mobileTel: "+972585008447",
    whatsapp: WHATSAPP_HE,
    whatsappLabel: "WhatsApp",
    officeLabel: "משרד",
    inquiry: "צור קשר",
    knowledge: "ידע מקצועי",
    expertiseArticle: "אתגרים הנדסיים",
  },
  en: {
    desc: "Engineering beyond the surface. Uncompromising execution in luxury construction.",
    g1Label: "G1 Registered Contractor",
    contractorName: "Binyan Eitan Ltd.",
    licenseNumber: "41805",
    classification: "G1 (C1) - Branch 100",
    address: "Jerusalem / Lod, Israel",
    contactHeading: "Contact",
    nav: "Navigation",
    portfolio: "Portfolio",
    about: "The Firm",
    rights: "All rights reserved to Binyan Eitan.",
    email: "office@binyaneitan.com",
    officePhone: "02-5000447",
    officePhoneTel: "+97225000447",
    mobile: "058-5008447",
    mobileTel: "+972585008447",
    whatsapp: WHATSAPP_EN,
    whatsappLabel: "WhatsApp",
    officeLabel: "Office",
    inquiry: "Inquiry",
    knowledge: "Knowledge",
    expertiseArticle: "Engineering Challenges",
  },
} as const;

// Minimal WhatsApp SVG icon
function WhatsAppIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function Footer() {
  const { lang } = useLang() as { lang: Lang };
  const content = copy[lang];

  return (
    <footer className="bg-charcoal text-bone py-10 md:py-14 border-t border-charcoal-light">
      <div className="max-w-[1440px] mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 text-start items-start">

          {/* Brand column */}
          <div className="md:col-span-5">
            <div className="mb-6 opacity-90 brightness-0 invert">
              <Image src="/logo.png" alt="Binyan Eitan" width={160} height={45} className="h-10 w-auto" />
            </div>
            {/* G1 Certification Label */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 border border-accent/40 px-3 py-1.5">
                <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
                <span className="font-body text-[0.6rem] font-semibold tracking-[0.22em] uppercase text-accent/90">
                  {content.g1Label}
                </span>
              </span>
              <div className="mt-2 text-[0.72rem] text-bone/70">
                <div>{content.contractorName}</div>
                <div>{lang === "he" ? `מס' רישיון: ${content.licenseNumber}` : `License #: ${content.licenseNumber}`}</div>
                <div className="text-[0.65rem] text-bone/50">{content.classification}</div>
              </div>
            </div>
            <p className="font-body text-bone/60 text-sm leading-relaxed max-w-sm">
              {content.desc}
            </p>
          </div>

          {/* Contact column */}
          <div className="md:col-span-3 md:col-start-6 md:row-start-1">
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray mb-6">
              {content.contactHeading}
            </h4>
            <ul className="space-y-4 font-body text-sm text-bone/70">
              <li>{content.address}</li>
              <li>
                <a href={`tel:${content.officePhoneTel}`} className="hover:text-accent transition-colors block">
                  <span className="text-bone/40 text-xs me-2 uppercase tracking-wider">{content.officeLabel}</span>
                  <bdi>{content.officePhone}</bdi>
                </a>
              </li>
              <li>
                <a
                  href={content.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent transition-colors inline-flex items-center gap-2"
                >
                  <WhatsAppIcon />
                  <bdi>{content.mobile}</bdi>
                </a>
              </li>
              <li>
                <a href={`mailto:${content.email}`} className="hover:text-accent transition-colors block break-all">
                  {content.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Nav column */}
          <div className="md:col-span-2 md:col-start-9 md:row-start-1">
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray mb-6">
              {content.nav}
            </h4>
            <ul className="space-y-4 font-body text-sm text-bone/70">
              <li><Link href={`/${lang}#portfolio`} className="hover:text-accent transition-colors block">{content.portfolio}</Link></li>
              <li><Link href={`/${lang}/about`} className="hover:text-accent transition-colors block">{content.about}</Link></li>
              <li><Link href={`/${lang}#contact`} className="hover:text-accent transition-colors block">{content.inquiry}</Link></li>
            </ul>
          </div>

          {/* Knowledge column */}
          <div className="md:col-span-2 md:col-start-11 md:row-start-1">
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray mb-6">
              {content.knowledge}
            </h4>
            <ul className="space-y-4 font-body text-sm text-bone/70">
              <li><Link href={`/${lang}/expertise`} className="hover:text-accent transition-colors block">{content.expertiseArticle}</Link></li>
            </ul>
          </div>

        </div>

        <div className="mt-20 pt-8 border-t border-bone/10 text-start space-y-3">
          {/* Legal nav */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href={`/${lang}/legal`} className="font-body text-[0.6rem] tracking-[0.15em] uppercase text-bone/35 hover:text-accent transition-colors">
              {lang === "he" ? "תנאי שימוש" : "Terms of Use"}
            </Link>
            <span className="text-bone/15" aria-hidden="true">·</span>
            <Link href={`/${lang}/legal`} className="font-body text-[0.6rem] tracking-[0.15em] uppercase text-bone/35 hover:text-accent transition-colors">
              {lang === "he" ? "מדיניות פרטיות" : "Privacy Policy"}
            </Link>
            <span className="text-bone/15" aria-hidden="true">·</span>
            <Link href={`/${lang}/legal`} className="font-body text-[0.6rem] tracking-[0.15em] uppercase text-bone/35 hover:text-accent transition-colors">
              {lang === "he" ? "הצהרת נגישות" : "Accessibility Statement"}
            </Link>
          </div>
          {/* Copyright + disclaimer */}
          <p className="font-body text-[0.6rem] tracking-wider text-bone/25">
            &copy; {new Date().getFullYear()} {content.rights}
            {" · "}
            {lang === "he"
              ? "כל התמונות באתר הן לצרכי המחשה בלבד."
              : "All images are for illustration purposes only."}
          </p>
        </div>
      </div>
    </footer>
  );
}
