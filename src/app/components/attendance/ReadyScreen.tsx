"use client";

// Final pre-submit screen — GPS is locked, project chosen, worker
// clocked in/out. Two large action buttons (green = in, red = out)
// plus secondary controls to change site or switch user.

import { LogIn, LogOut, Building2 } from "lucide-react";
import Screen from "./Screen";
import type { Lang, ScreenStrings } from "./i18n";
import type { Project } from "./types";

interface Props {
  t: ScreenStrings;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  backHref: string;
  backLabel: string;
  workerName: string | null;
  projects: Project[];
  selectedProjectId: string;
  onSubmit: (action: "in" | "out") => void;
  onChangeProject: () => void;
  onReset: () => void;
}

export default function ReadyScreen(p: Props) {
  const selectedProject = p.projects.find(pr => pr.id === p.selectedProjectId);
  return (
    <Screen backHref={p.backHref} backLabel={p.backLabel} lang={p.lang} onLangChange={p.onLangChange}>
      <div className="text-center space-y-1">
        <p className="font-body text-[0.75rem] font-bold tracking-[0.22em] uppercase text-accent-dark">{p.t.locationOk}</p>
        {p.workerName && <p className="font-heading text-base text-charcoal/70">{p.workerName}</p>}
        {selectedProject && (
          <div className="flex items-center justify-center gap-1 text-xs text-charcoal/65">
            <Building2 size={12} strokeWidth={1.5} /><span>{selectedProject.name}</span>
          </div>
        )}
      </div>
      <div className="w-full grid grid-cols-2 gap-4">
        <button onClick={() => p.onSubmit("in")}
          className="flex flex-col items-center justify-center gap-3 bg-green-600 hover:bg-green-700 active:scale-95 py-8 transition-all duration-150 rounded-sm">
          <LogIn size={32} strokeWidth={1.5} className="text-white" />
          <span className="font-heading text-lg font-bold text-white">{p.t.clockIn}</span>
        </button>
        <button onClick={() => p.onSubmit("out")}
          className="flex flex-col items-center justify-center gap-3 bg-red-500 hover:bg-red-600 active:scale-95 py-8 transition-all duration-150 rounded-sm">
          <LogOut size={32} strokeWidth={1.5} className="text-white" />
          <span className="font-heading text-lg font-bold text-white">{p.t.clockOut}</span>
        </button>
      </div>
      <div className="flex flex-col items-center gap-2">
        <button onClick={p.onChangeProject} className="font-body text-xs text-charcoal/30 hover:text-charcoal/60 transition-colors duration-200 underline underline-offset-2">{p.t.changeSite}</button>
        <button onClick={p.onReset} className="font-body text-xs text-charcoal/20 hover:text-charcoal/65 transition-colors duration-200">{p.t.changeNumber}</button>
      </div>
    </Screen>
  );
}
