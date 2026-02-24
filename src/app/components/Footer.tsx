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
    about: "הפילוסופיה שלנו",
    rights: "כל הזכויות שמורות לבניין איתן.",
  },
  en: {
    desc: "Engineering beyond the surface. Uncompromising execution in luxury construction.",
    address: "Jerusalem, Israel",
    contact: "Contact Us",
    nav: "Navigation",
    projects: "Projects",
    about: "Our Philosophy",
    rights: "All rights reserved to Binyan Eitan.",
  }
} as const;

export default function Footer() {
  const { lang } = useLang();
  const content = copy[lang];

  return (
    <footer className="bg-charcoal text-bone py-16 md:py-24 border-t border-charcoal-light">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          
          {/* לוגו ותיאור */}
          <div className="md:col-span-5">
            <div className="mb-8 opacity-90 brightness-0 invert">
              <Image src="/logo.png" alt="Binyan Eitan" width={160} height={45} className="h-10 w-auto" />
            </div>
            <p className="font-body text-bone/60 text-sm leading-relaxed max-w-sm">
              {content.desc}
            </p>
          </div>

          {/* פרטי קשר */}
          <div className="md:col-span-3 md:col-start-7">
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray mb-6">{content.contact}</h4>
            <ul className="space-y-4 font-body text-sm text-bone/70">
              <li>{content.address}</li>
              <li><a href="tel:+97200000000" className="hover:text-accent transition-colors block" dir="ltr">+972 (0) 50 000 0000</a></li>
              <li><a href="mailto:info@binyan-eitan.co.il" className="hover:text-accent transition-colors block">info@binyan-eitan.co.il</a></li>
            </ul>
          </div>

          {/* לינקים לניווט */}
          <div className="md:col-span-3">
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-warm-gray mb-6">{content.nav}</h4>
            <ul className="space-y-4 font-body text-sm text-bone/70">
              <li><Link href={`/${lang}#projects`} className="hover:text-accent transition-colors block">{content.projects}</Link></li>
              <li><Link href={`/${lang}#about`} className="hover:text-accent transition-colors block">{content.about}</Link></li>
              <li><Link href={`/${lang}#contact`} className="hover:text-accent transition-colors block">{content.contact}</Link></li>
            </ul>
          </div>

        </div>

        {/* זכויות יוצרים */}
        <div className="mt-20 pt-8 border-t border-bone/10 flex justify-center md:justify-start">
          <p className="font-body text-xs tracking-wider text-bone/40 uppercase">
            &copy; {new Date().getFullYear()} {content.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
