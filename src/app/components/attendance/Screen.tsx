"use client";

// Shared screen chrome for every step of the worker attendance flow:
// fixed home + back links, centered logo, the children area, and the
// language switcher. Direction (rtl/ltr) is derived from the active
// language via langDir() so each new language stays consistent across
// every screen.

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Globe } from "lucide-react";
import { T, SUPPORTED_LANGS, LANG_AUTONYMS, langDir, type Lang } from "./i18n";

interface Props {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  lang: Lang;
  onLangChange: (l: Lang) => void;
}

export default function Screen({ children, backHref, backLabel, lang, onLangChange }: Props) {
  const dir = langDir(lang);
  const isRtl = dir === "rtl";
  return (
    <div className="relative min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-16 gap-6" dir={dir}>
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
      <LanguagePicker lang={lang} onLangChange={onLangChange} />
      <p className="font-body text-xs tracking-widest uppercase text-charcoal/20">
        {T[lang].footer}
      </p>
    </div>
  );
}

// LanguagePicker — a single inline row of language autonyms (e.g.
// "עברית · English · Русский · සිංහල · 中文 · हिन्दी") prefaced by a
// globe icon. Each language is rendered in its own script so a worker
// who can't read Hebrew can still locate their own language without
// flags (which conflate language with country). The row direction is
// pinned LTR regardless of `dir` so the order is the same in every
// language — workers who learn "third item from the left" keep that
// mental model.
function LanguagePicker({ lang, onLangChange }: { lang: Lang; onLangChange: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap justify-center" dir="ltr">
      <Globe size={12} strokeWidth={1.5} className="text-charcoal/30" />
      {SUPPORTED_LANGS.map((l, i) => (
        <span key={l} className="flex items-center gap-2">
          {i > 0 && <span className="text-charcoal/15 text-xs">·</span>}
          <button
            type="button"
            onClick={() => onLangChange(l)}
            lang={l}
            aria-current={lang === l ? "true" : undefined}
            className={`font-body text-xs transition-colors duration-150 ${lang === l ? "text-accent font-bold" : "text-charcoal/30 hover:text-charcoal/60"}`}
          >
            {LANG_AUTONYMS[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
