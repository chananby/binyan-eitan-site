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
        <p className="font-body text-xs text-charcoal/40">{p.t.manualHint}</p>
      </div>

      {/* clock-in / clock-out toggle */}
      <div className="w-full grid grid-cols-2 gap-3">
        <button onClick={() => p.setManualAction("in")}
          className={`py-4 font-body text-sm font-semibold tracking-wider border transition-all duration-150 ${p.manualAction === "in" ? "bg-charcoal text-bone border-charcoal" : "border-charcoal/20 text-charcoal/65 hover:border-accent"}`}>
          {p.t.clockIn}
        </button>
        <button onClick={() => p.setManualAction("out")}
          className={`py-4 font-body text-sm font-semibold tracking-wider border transition-all duration-150 ${p.manualAction === "out" ? "bg-charcoal text-bone border-charcoal" : "border-charcoal/20 text-charcoal/65 hover:border-accent"}`}>
          {p.t.clockOut}
        </button>
      </div>

      {/* Date + Time — date takes 2/3 of the row, time takes 1/3.
          Even-split grid-cols-2 leaves the time input visually overweight
          because <input type="time"> renders its own clock-icon padding;
          a 2:1 ratio is closer to the natural information density (date
          is "DD/MM/YYYY" while time is just "HH:MM"). */}
      <div className="w-full grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <p className="font-body text-[0.75rem] text-charcoal/65 font-semibold tracking-wide uppercase">{p.t.manualDateLabel}</p>
          <input type="date" value={p.manualDate} max={todayIso} onChange={e => p.setManualDate(e.target.value)}
            className="w-full border border-charcoal/20 bg-white px-3 py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors" dir="ltr" />
        </div>
        <div className="col-span-1 space-y-1">
          <p className="font-body text-[0.75rem] text-charcoal/65 font-semibold tracking-wide uppercase">
            {p.manualAction === "in" ? p.t.manualTimeIn : p.t.manualTimeOut}
          </p>
          <input type="time" value={p.manualTime} onChange={e => p.setManualTime(e.target.value)}
            placeholder="HH:MM"
            className="w-full border border-charcoal/20 bg-white px-3 py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors" dir="ltr" />
        </div>
      </div>

      {/* Project (optional) */}
      {p.projects.length > 0 && (
        <div className="w-full space-y-1">
          <p className="font-body text-[0.75rem] text-charcoal/65 font-semibold tracking-wide uppercase">{p.t.manualProjectLabel}</p>
          <select value={p.manualProject} onChange={e => p.setManualProject(e.target.value)}
            className="w-full border border-charcoal/20 bg-white px-3 py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors">
            <option value="">{p.t.manualNoSite}</option>
            {p.projects.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
          </select>
        </div>
      )}

      {p.manualError && <p className="font-body text-sm text-red-500 text-center">{p.manualError}</p>}

      <button onClick={p.onSubmit} disabled={p.manualLoading}
        className="w-full bg-accent py-4 font-body text-sm font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors duration-200">
        {p.manualLoading ? p.t.corrSending : p.t.manualSubmit}
      </button>
      <button onClick={p.onBackToHistory}
        className="w-full border border-charcoal/20 py-3 font-body text-sm text-charcoal/40 hover:text-accent hover:border-accent transition-colors duration-200">
        {p.t.manualBackToHistory}
      </button>
    </Screen>
  );
}
