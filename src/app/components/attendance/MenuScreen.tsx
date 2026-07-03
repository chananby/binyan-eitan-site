"use client";

// Post-identify landing screen. Three worker actions: start clock,
// view history, switch user. The "switch user" control is visually
// separated by a top border so it doesn't read as a fourth peer
// action. The old "manual entry" button was removed when worker-side
// manual entry was deprecated — forgotten clocks now go through the
// foreman, and the missing-exit banner at the top guides the worker
// to the history screen where the correction flow lives.

import { MapPin, AlertCircle, UserRound, Clock, ChevronLeft } from "lucide-react";
import Screen from "./Screen";
import type { Lang, ScreenStrings } from "./i18n";

interface Props {
  t: ScreenStrings;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  backHref: string;
  backLabel: string;
  workerName: string | null;
  geoError: string | null;
  /** Past days with a clock-in but no clock-out (still correctable). 0 = no banner. */
  missingExitCount: number;
  onStartClock: () => void;
  onShowHistory: () => void;
  onSwitchUser: () => void;
}

export default function MenuScreen(p: Props) {
  const missingExitText = p.missingExitCount === 1
    ? p.t.missingExitOne
    : p.t.missingExitMany.replace("{n}", String(p.missingExitCount));
  return (
    <Screen backHref={p.backHref} backLabel={p.backLabel} lang={p.lang} onLangChange={p.onLangChange}>
      {p.missingExitCount > 0 && (
        <button onClick={p.onShowHistory}
          className="w-full flex items-start gap-2.5 border border-amber-200 bg-amber-50 px-4 py-3 text-start hover:bg-amber-100/60 transition-colors duration-200">
          <Clock size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-amber-600" />
          <span className="flex-1 font-body text-xs text-amber-800 leading-snug">
            {missingExitText}
            <span className="mt-1 flex items-center gap-0.5 font-semibold text-amber-700">
              {p.t.missingExitCta}
              <ChevronLeft size={13} strokeWidth={2} />
            </span>
          </span>
        </button>
      )}
      <div className="text-center space-y-1">
        <p className="font-heading text-xl font-bold text-charcoal">{p.t.hello} {p.workerName}</p>
        <p className="font-body text-xs text-charcoal/40">{p.t.menuPrompt}</p>
      </div>
      <div className="w-full space-y-3">
        <button onClick={p.onStartClock}
          className="w-full bg-accent py-5 font-heading text-base font-bold tracking-[0.15em] uppercase text-bone hover:bg-accent-dark transition-colors duration-200 flex items-center justify-center gap-2">
          <MapPin size={18} strokeWidth={1.5} />
          {p.t.startClock}
        </button>
        <button onClick={p.onShowHistory}
          className="w-full border border-charcoal/20 py-4 font-body text-sm font-semibold tracking-wider uppercase text-charcoal/65 hover:border-accent hover:text-accent transition-colors duration-200">
          {p.t.myHistory}
        </button>
        {p.geoError && (
          <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
            <p className="font-body text-xs text-red-600 leading-snug">{p.geoError}</p>
          </div>
        )}
      </div>

      <div className="w-full pt-4 mt-2 border-t border-charcoal/10">
        <button onClick={p.onSwitchUser}
          className="w-full flex items-center justify-center gap-2 border border-charcoal/20 py-3 font-body text-sm font-semibold text-charcoal/65 hover:border-accent hover:text-accent transition-colors duration-200">
          <UserRound size={15} strokeWidth={1.5} />
          <span>🔄 {p.t.switchUser}</span>
        </button>
      </div>
    </Screen>
  );
}
