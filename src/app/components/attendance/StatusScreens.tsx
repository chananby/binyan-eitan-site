"use client";

// Four small status/result screens bundled together — each is <50 lines
// of pure presentation and they share most of their imports:
//   - SubmittingScreen / LocatingScreen — full-screen spinners
//   - ErrorScreen                       — error message + try-again
//   - SuccessScreen                     — clock-in/out confirmation with flash
// State and callbacks (reset, fetchHistory) come from AttendanceForm.
// ManualSuccessScreen was removed alongside worker-side manual entry.

import { Loader2, MapPin, AlertCircle, CheckCircle, Building2 } from "lucide-react";
import Screen from "./Screen";
import SuccessFlash from "../SuccessFlash";
import type { Lang, ScreenStrings } from "./i18n";
import type { Project } from "./types";

interface Common {
  t: ScreenStrings;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  backHref: string;
  backLabel: string;
}

export function SubmittingScreen(p: Common) {
  return (
    <Screen backHref={p.backHref} backLabel={p.backLabel} lang={p.lang} onLangChange={p.onLangChange}>
      <Loader2 size={48} strokeWidth={1.5} className="text-accent animate-spin" />
      <p className="font-body text-sm text-charcoal/65 tracking-wider">{p.t.sending}</p>
    </Screen>
  );
}

export function LocatingScreen(p: Common) {
  return (
    <Screen backHref={p.backHref} backLabel={p.backLabel} lang={p.lang} onLangChange={p.onLangChange}>
      <MapPin size={48} strokeWidth={1.5} className="text-accent animate-pulse" />
      <p className="font-body text-sm text-charcoal/65 tracking-wider">{p.t.locating}</p>
    </Screen>
  );
}

export function ErrorScreen(p: Common & { errorMsg: string | null; onReset: () => void }) {
  return (
    <Screen backHref={p.backHref} backLabel={p.backLabel} lang={p.lang} onLangChange={p.onLangChange}>
      <AlertCircle size={56} strokeWidth={1} className="text-red-400" />
      <p className="font-body text-center text-sm text-charcoal/70 leading-relaxed max-w-xs whitespace-pre-line">{p.errorMsg}</p>
      <button onClick={p.onReset}
        className="mt-4 w-full bg-charcoal py-4 font-body text-sm font-semibold tracking-wider uppercase text-bone hover:bg-charcoal/80 transition-colors duration-200">
        {p.t.tryAgain}
      </button>
    </Screen>
  );
}

export function SuccessScreen(p: Common & {
  action: "in" | "out" | null;
  workerName: string | null;
  timestamp: string;
  projects: Project[];
  selectedProjectId: string;
  autoRegistered: boolean;
  dailyMessage: string | null;
  showFlash: boolean;
  flashVariant: "in" | "out";
  onFlashDone: () => void;
  onReset: () => void;
}) {
  const isIn = p.action === "in";
  const selectedProject = p.projects.find(pr => pr.id === p.selectedProjectId);
  return (
    <>
    <SuccessFlash show={p.showFlash} onDone={p.onFlashDone} variant={p.flashVariant} />
    <Screen backHref={p.backHref} backLabel={p.backLabel} lang={p.lang} onLangChange={p.onLangChange}>
      <CheckCircle size={64} strokeWidth={1} className={isIn ? "text-green-500" : "text-red-400"} />
      <div className="text-center space-y-1">
        <p className="font-heading text-2xl font-bold text-charcoal">{isIn ? p.t.recordedIn : p.t.recordedOut}</p>
        {p.workerName && <p className="font-heading text-xl text-charcoal/80">{p.t.hello} {p.workerName}</p>}
        <p className="font-body text-sm text-charcoal/40">{p.timestamp}</p>
        {selectedProject && (
          <div className="flex items-center justify-center gap-1 text-sm text-charcoal/65 mt-1">
            <Building2 size={14} strokeWidth={1.5} /><span>{selectedProject.name}</span>
          </div>
        )}
      </div>
      {p.autoRegistered && (
        <div className="w-full rounded-sm border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="mb-1 font-body text-[0.75rem] font-bold tracking-[0.18em] uppercase text-amber-500">{p.t.autoReg}</p>
          <p className="font-body text-sm leading-relaxed text-charcoal/80">{p.t.autoRegBody}</p>
        </div>
      )}
      {p.dailyMessage ? (
        <div className="w-full rounded-sm border border-sky-200 bg-sky-50 px-5 py-4">
          <p className="mb-1 font-body text-[0.75rem] font-bold tracking-[0.18em] uppercase text-sky-400">{p.t.dayMsg}</p>
          <p className="font-body text-base leading-relaxed text-charcoal/80">{p.dailyMessage}</p>
        </div>
      ) : (
        <p className="font-body text-sm text-charcoal/30">{isIn ? p.t.goodWorkIn : p.t.goodWorkOut}</p>
      )}
      <button onClick={p.onReset}
        className="mt-2 w-full border border-charcoal/20 py-4 font-body text-sm font-semibold tracking-wider uppercase text-charcoal/65 hover:border-accent hover:text-accent transition-colors duration-200">
        {p.t.anotherReport}
      </button>
    </Screen>
    </>
  );
}

// ManualSuccessScreen was removed alongside worker-side manual entry —
// there's no "your manual entry was submitted" moment anymore. Kept
// intentionally empty here as a signpost; new consumers should go via
// the foreman flow, not resurrect this screen.
