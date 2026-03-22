"use client";

import Link from "next/link";
import {
  ShieldCheck, Activity, Swords, Users, ClipboardList,
  Building2, Globe, Info, Briefcase, FileText, Home,
  ExternalLink, Wrench, DollarSign, Calendar,
} from "lucide-react";

interface HubLink {
  href: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  external?: boolean;
  highlight?: boolean;
}

interface HubSection {
  title: string;
  links: HubLink[];
}

const SECTIONS: HubSection[] = [
  {
    title: "ניהול",
    links: [
      { href: "/admin",           label: "ממשק ניהול",        sub: "פרויקטים · עובדים · נוכחות",  icon: <ShieldCheck size={18} />, highlight: true },
      { href: "/admin/executive", label: "War Room",           sub: "חנן ומוטי — לוח פנימי",        icon: <Swords       size={18} />, highlight: true },
      { href: "/admin/health",    label: "בדיקת מערכת",        sub: "אבחון מלא של כל השירותים",     icon: <Activity     size={18} /> },
    ],
  },
  {
    title: "נוכחות",
    links: [
      { href: "/attendance",      label: "דיווח נוכחות",       sub: "קישור לעובדים — GPS + טלפון",  icon: <ClipboardList size={18} /> },
    ],
  },
  {
    title: "אתר ציבורי — עברית",
    links: [
      { href: "/he",              label: "דף הבית",            sub: "/he",                           icon: <Home         size={18} /> },
      { href: "/he/about",        label: "מי אנחנו",           sub: "/he/about",                     icon: <Info         size={18} /> },
      { href: "/he/projects",     label: "תיק עבודות",         sub: "/he/projects",                  icon: <Briefcase    size={18} /> },
      { href: "/he/change-order", label: "טופס שינוי הזמנה",   sub: "/he/change-order",              icon: <FileText     size={18} /> },
    ],
  },
  {
    title: "Public Site — English",
    links: [
      { href: "/en",              label: "Home",               sub: "/en",                           icon: <Globe        size={18} /> },
      { href: "/en/about",        label: "About Us",           sub: "/en/about",                     icon: <Info         size={18} /> },
      { href: "/en/projects",     label: "Portfolio",          sub: "/en/projects",                  icon: <Briefcase    size={18} /> },
      { href: "/en/change-order", label: "Change Order",       sub: "/en/change-order",              icon: <FileText     size={18} /> },
    ],
  },
  {
    title: "כלים",
    links: [
      { href: "https://supabase.com/dashboard",    label: "Supabase",         sub: "בסיס נתונים",            icon: <Building2    size={18} />, external: true },
      { href: "https://vercel.com/dashboard",      label: "Vercel",           sub: "פרסום ו-Hosting",        icon: <Globe        size={18} />, external: true },
      { href: "https://resend.com",                label: "Resend",           sub: "מיילים",                 icon: <DollarSign   size={18} />, external: true },
      { href: "https://cloudinary.com/console",    label: "Cloudinary",       sub: "גלריית תמונות",          icon: <Calendar     size={18} />, external: true },
    ],
  },
];

function LinkCard({ link }: { link: HubLink }) {
  const inner = (
    <div className={`group flex items-center gap-3.5 px-4 py-3.5 border transition-all duration-150 cursor-pointer
      ${link.highlight
        ? "border-[#8D775F]/40 bg-[#8D775F]/[0.08] hover:bg-[#8D775F]/[0.15] hover:border-[#8D775F]/60"
        : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/15"
      }`}
    >
      <span className={`shrink-0 ${link.highlight ? "text-[#8D775F]" : "text-white/30 group-hover:text-white/60"} transition-colors`}>
        {link.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${link.highlight ? "text-[#C4A882]" : "text-white/80"}`}>
          {link.label}
        </p>
        {link.sub && (
          <p className="text-[0.65rem] text-white/30 mt-0.5 truncate">{link.sub}</p>
        )}
      </div>
      {link.external && <ExternalLink size={12} className="shrink-0 text-white/20 group-hover:text-white/50 transition-colors" />}
    </div>
  );

  if (link.external) {
    return <a href={link.href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  return <Link href={link.href}>{inner}</Link>;
}

export default function HubPage() {
  return (
    <div className="min-h-screen bg-[#141210] text-white" dir="rtl">

      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench size={17} strokeWidth={1.5} className="text-[#8D775F]" />
          <div>
            <p className="text-[0.55rem] font-bold tracking-[0.25em] uppercase text-white/25">בניין איתן</p>
            <h1 className="text-sm font-bold text-white/90 leading-none">מרכז שליטה</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.6rem] text-white/15 tracking-wide">כניסה מורשית בלבד</span>
          <ShieldCheck size={13} strokeWidth={1.5} className="text-white/15" />
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-7">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <p className="text-[0.6rem] font-bold tracking-[0.2em] uppercase text-white/25 mb-2.5 px-0.5">
              {section.title}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {section.links.map(link => (
                <LinkCard key={link.href} link={link} />
              ))}
            </div>
          </div>
        ))}

        <p className="text-center text-[0.58rem] text-white/10 pt-4">
          /admin/hub · בניין איתן
        </p>
      </div>
    </div>
  );
}
