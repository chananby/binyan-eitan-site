"use client";

// Worker-portal entry screen: phone-number input → /api/worker/identify.
// The parent owns identify() and all state — this component is a pure
// view that surfaces input, submit, and error chrome.

import Link from "next/link";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import Screen from "./Screen";
import type { Lang, ScreenStrings } from "./i18n";

interface Props {
  t: ScreenStrings;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  backHref: string;
  backLabel: string;
  phone: string;
  setPhone: (v: string) => void;
  identifying: boolean;
  identifyError: string | null;
  onIdentify: () => void;
}

export default function PhoneScreen(p: Props) {
  return (
    <Screen backHref={p.backHref} backLabel={p.backLabel} lang={p.lang} onLangChange={p.onLangChange}>
      <div className="text-center space-y-1">
        <p className="font-heading text-xl font-bold text-charcoal">{p.t.clockTitle}</p>
        <p className="font-body text-xs text-charcoal/40">{p.t.phonePrompt}</p>
      </div>
      <div className="w-full space-y-4">
        <input
          type="tel" inputMode="numeric" value={p.phone}
          onChange={(e) => p.setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && p.onIdentify()}
          placeholder="05X-XXX-XXXX"
          className="w-full border border-charcoal/20 bg-white px-5 py-5 text-center font-body text-xl tracking-widest text-charcoal placeholder-charcoal/20 focus:border-accent focus:outline-none transition-colors duration-200"
          autoComplete="tel" dir="ltr"
        />
        {p.identifyError && (
          <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="font-body text-xs text-red-600 leading-snug">{p.identifyError}</p>
              {/* Show the join-request CTA only on the "phone not in
                  staff list" case — other identify errors (inactive,
                  rate-limited, PIN expired) wouldn't be fixed by joining.
                  Comparing against p.t.notFound keeps this language-safe. */}
              {p.identifyError === p.t.notFound && (
                <Link
                  href="/he/join"
                  className="font-body text-xs text-accent hover:text-accent-dark underline underline-offset-2 self-start"
                >
                  {p.t.joinCta}
                </Link>
              )}
            </div>
          </div>
        )}
        <button onClick={p.onIdentify} disabled={p.identifying || p.phone.replace(/\D/g, "").length < 9}
          className="w-full bg-accent py-5 font-heading text-base font-bold tracking-[0.15em] uppercase text-bone transition-colors duration-200 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2">
          {p.identifying ? <><Loader2 size={18} className="animate-spin" /> {p.t.identifying}</> : <>{p.t.identify}</>}
        </button>

        {/* Permanent "new worker?" CTA — without the old PIN gate this
            screen is the very first thing a brand-new worker sees, so the
            join link has to be visible up front (not only inside the
            notFound error block). Outlined-accent button to read as an
            interactive secondary action without competing with the bone
            "המשך" submit above. */}
        <Link
          href="/he/join"
          className="w-full inline-flex items-center justify-center gap-2 rounded-sm border border-accent bg-white px-5 py-3 font-body text-sm font-semibold text-accent hover:bg-accent hover:text-bone transition-colors"
        >
          <UserPlus size={14} strokeWidth={2} />
          {p.t.joinCta}
        </Link>
      </div>
    </Screen>
  );
}
