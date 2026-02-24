"use client";

import Link from "next/link";
import Image from "next/image";
import { useLang } from "./LangContext";

const copy = {
  he: {
    desc: "הנדסה מעבר לפני השטח. ביצוע ללא פשרות בסטנדרט בנייה יוקרתית.",
    address: "ירושלים, ישראל",
    contact: "יצירת קשר",
    nav: "ניווט",
    projects: "פרויקטים",
    about: "אודות",
    rights: "כל הזכויות שמורות לבניין איתן.",
    email: "motyeitan10@gmail.com", // המייל המעודכן
    phone: "052-328-1153" // הטלפון המעודכן
  },
  en: {
    desc: "Engineering beyond the surface. Uncompromising execution in luxury construction.",
    address: "Jerusalem, Israel",
    contact: "Contact Us",
    nav: "Navigation",
    projects: "Projects",
    about: "About",
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
            <div className="mb-8 opacity-90 brightness-0 invert">
              <Image src="/logo.png" alt="Binyan Eitan" width={160} height={45} className="h-10 w-auto" />
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
              <li><Link href={`/${lang}#projects`} className="hover:text-accent transition-colors block">{content.projects}</Link></li>
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
