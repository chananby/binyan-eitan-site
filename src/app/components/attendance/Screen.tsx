"use client";

// Shared screen chrome for every step of the worker attendance flow:
// fixed home + back links, centered logo, the children area, and the
// he↔ru language switcher. Layout/style are byte-identical to what used
// to live as a local helper inside AttendanceForm.tsx.

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { T, type Lang } from "./i18n";

interface Props {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  lang: Lang;
  onLangChange: (l: Lang) => void;
}

export default function Screen({ children, backHref, backLabel, lang, onLangChange }: Props) {
  const isRtl = lang === "he";
  return (
    <div className="relative min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-16 gap-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="absolute top-5 start-5">
        <Link href="/he"
          className="flex items-center gap-1 font-body text-xs text-charcoal/30 hover:text-accent transition-colors duration-200">
          <ChevronRight size={14} strokeWidth={1.5} className={isRtl ? "rotate-180" : ""} />
          <span>{T[lang].home}</span>
        </Link>
      </div>
      {backHref && (
        <div className="absolute top-5 end-5">
          <Link href={backHref}
            className="flex items-center gap-1 font-body text-xs text-charcoal/35 hover:text-accent transition-colors duration-200">
            <ChevronRight size={14} strokeWidth={1.5} />
            <span>{backLabel}</span>
          </Link>
        </div>
      )}
      <Link href={backHref ?? "/he/internal"} className="mb-2">
        <Image src="/logo.png" alt="Binyan Eitan" width={110} height={32} className="h-8 w-auto brightness-0 opacity-60" />
      </Link>
      {children}
      <div className="flex items-center gap-2 mt-2">
        <button onClick={() => onLangChange("he")}
          className={`font-body text-xs transition-colors duration-150 ${lang === "he" ? "text-accent font-bold" : "text-charcoal/25 hover:text-charcoal/50"}`}>
          עב
        </button>
        <span className="text-charcoal/15 text-xs">|</span>
        <button onClick={() => onLangChange("ru")}
          className={`font-body text-xs transition-colors duration-150 ${lang === "ru" ? "text-accent font-bold" : "text-charcoal/25 hover:text-charcoal/50"}`}>
          RU
        </button>
      </div>
      <p className="font-body text-[0.7rem] tracking-widest uppercase text-charcoal/20">
        {T[lang].footer}
      </p>
    </div>
  );
}
