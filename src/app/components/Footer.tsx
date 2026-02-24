"use client";

import Link from "next/link";
import Image from "next/image";
import { useLang } from "./LangContext";

const copy = {
  he: {
    desc: "הנדסה מעבר לפני השטח. ביצוע ללא פשרות בסטנדרט בנייה יוקרתית.",
    g1Label: "קבלן רשום ג1",
    address: "ירושלים, ישראל",
    contact: "פנייה",
    nav: "ניווט",
    portfolio: "תיק עבודות",
    about: "המשרד",
    rights: "כל הזכויות שמורות לבניין איתן.",
    email: "motyeitan10@gmail.com",
    phone: "052-328-1153"
  },
  en: {
    desc: "Engineering beyond the surface. Uncompromising execution in luxury construction.",
    g1Label: "G1 Registered Contractor",
    address: "Jerusalem, Israel",
    contact: "Inquiry",
    nav: "Navigation",
    portfolio: "Portfolio",
    about: "The Firm",
    rights: "All rights reserved to Binyan Eitan.",
    email: "motyeitan10@gmail.com",
    phone: "052-328-1153"
  }
} as const;

export default function Footer() {
  const { lang } = useLang();
  const content = copy[lang];

  return (
    <footer className="bg-charcoal text-bone py-16 md:py-24 border-t border-charcoal-light">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 text-start">
          
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
            </div>
            <p className="font-body text-bone/60 text-sm leading-relaxed max-w-sm">
              {content.desc}
            </p>
          </div>

          <div className="md:col-span-3 md:col-start-7">
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray mb-6">{content.contact}</h4>
            <ul className="space-y-4 font-body text-sm text-bone/70">
              <li>{content.address}</li>
              <li dir="ltr" className="text-start">
                <a href={`tel:${content.phone}`} className="hover:text-accent transition-colors block">{content.phone}</a>
              </li>
              <li>
                <a href={`mailto:${content.email}`} className="hover:text-accent transition-colors block">{content.email}</a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray mb-6">{content.nav}</h4>
            <ul className="space-y-4 font-body text-sm text-bone/70">
              <li><Link href={`/${lang}#portfolio`} className="hover:text-accent transition-colors block">{content.portfolio}</Link></li>
              <li><Link href={`/${lang}#about`} className="hover:text-accent transition-colors block">{content.about}</Link></li>
              <li><Link href={`/${lang}#contact`} className="hover:text-accent transition-colors block">{content.contact}</Link></li>
            </ul>
          </div>

        </div>

        <div className="mt-20 pt-8 border-t border-bone/10 text-start">
          <p className="font-body text-xs tracking-wider text-bone/40 uppercase">
            &copy; {new Date().getFullYear()} {content.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
