"use client";

// Worker-side "manual entry" — used when the worker forgot to clock at
// the right moment. Submits to /api/worker/manual-entry; admin must
// approve before it counts toward payroll.

import Screen from "./Screen";
import type { Lang, ScreenStrings } from "./i18n";
import type { Project } from "./types";

interface Props {
  t: ScreenStrings;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  backHref: string;
  backLabel: string;
  manualAction: "in" | "out";
  setManualAction: (v: "in" | "out") => void;
  manualDate: string;
  setManualDate: (v: string) => void;
  manualTime: string;
  setManualTime: (v: string) => void;
  manualProject: string;
  setManualProject: (v: string) => void;
  manualLoading: boolean;
  manualError: string | null;
  projects: Project[];
  onSubmit: () => void;
  onBackToHistory: () => void;
}

export default function ManualScreen(p: Props) {
  const todayIso = new Date().toISOString().slice(0, 10);
  return (
    <Screen backHref={p.backHref} backLabel={p.backLabel} lang={p.lang} onLangChange={p.onLangChange}>
      <div className="text-center space-y-1">
        <p className="font-heading text-xl font-bold text-charcoal">{p.t.manualTitle}</p>
        <p className="font-body text-xs text-charcoal/40">הדיווח ישלח לאישור המנהל</p>
      </div>

      {/* כניסה / יציאה toggle */}
      <div className="w-full grid grid-cols-2 gap-3">
        <button onClick={() => p.setManualAction("in")}
          className={`py-4 font-body text-sm font-semibold tracking-wider border transition-all duration-150 ${p.manualAction === "in" ? "bg-charcoal text-bone border-charcoal" : "border-charcoal/20 text-charcoal/50 hover:border-accent"}`}>
          {p.t.clockIn}
        </button>
        <button onClick={() => p.setManualAction("out")}
          className={`py-4 font-body text-sm font-semibold tracking-wider border transition-all duration-150 ${p.manualAction === "out" ? "bg-charcoal text-bone border-charcoal" : "border-charcoal/20 text-charcoal/50 hover:border-accent"}`}>
          {p.t.clockOut}
        </button>
      </div>

      {/* Date + Time */}
      <div className="w-full grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="font-body text-[0.75rem] text-charcoal/50 font-semibold tracking-wide uppercase">תאריך</p>
          <input type="date" value={p.manualDate} max={todayIso} onChange={e => p.setManualDate(e.target.value)}
            className="w-full border border-charcoal/20 bg-white px-3 py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors" dir="ltr" />
        </div>
        <div className="space-y-1">
          <p className="font-body text-[0.75rem] text-charcoal/50 font-semibold tracking-wide uppercase">שעה</p>
          <input type="time" value={p.manualTime} onChange={e => p.setManualTime(e.target.value)}
            className="w-full border border-charcoal/20 bg-white px-3 py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors" dir="ltr" />
        </div>
      </div>

      {/* Project (optional) */}
      {p.projects.length > 0 && (
        <div className="w-full space-y-1">
          <p className="font-body text-[0.75rem] text-charcoal/50 font-semibold tracking-wide uppercase">אתר (אופציונלי)</p>
          <select value={p.manualProject} onChange={e => p.setManualProject(e.target.value)}
            className="w-full border border-charcoal/20 bg-white px-3 py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors">
            <option value="">— ללא אתר —</option>
            {p.projects.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
          </select>
        </div>
      )}

      {p.manualError && <p className="font-body text-sm text-red-500 text-center">{p.manualError}</p>}

      <button onClick={p.onSubmit} disabled={p.manualLoading}
        className="w-full bg-accent py-4 font-body text-sm font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors duration-200">
        {p.manualLoading ? "שולח…" : "שלח לאישור"}
      </button>
      <button onClick={p.onBackToHistory}
        className="w-full border border-charcoal/20 py-3 font-body text-sm text-charcoal/40 hover:text-accent hover:border-accent transition-colors duration-200">
        חזור להיסטוריה
      </button>
    </Screen>
  );
}
