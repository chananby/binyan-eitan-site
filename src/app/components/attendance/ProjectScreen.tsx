"use client";

// Project picker — between GPS lock and clock-in. The worker chooses
// which active site they're clocking at; selection moves the flow to
// the "ready" step.

import { Building2, Loader2 } from "lucide-react";
import Screen from "./Screen";
import type { Lang, ScreenStrings } from "./i18n";
import type { Project } from "./types";

interface Props {
  t: ScreenStrings;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  backHref: string;
  backLabel: string;
  projects: Project[];
  projectsLoading: boolean;
  selectedProjectId: string;
  onPickProject: (id: string) => void;
  onReset: () => void;
}

export default function ProjectScreen(p: Props) {
  return (
    <Screen backHref={p.backHref} backLabel={p.backLabel} lang={p.lang} onLangChange={p.onLangChange}>
      <div className="text-center space-y-1">
        <Building2 size={36} strokeWidth={1.5} className="text-accent mx-auto" />
        <p className="font-heading text-xl font-bold text-charcoal">{p.t.pickSite}</p>
        <p className="font-body text-xs text-charcoal/40">{p.t.pickSiteSub}</p>
      </div>
      <div className="w-full space-y-3">
        {p.projectsLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-charcoal/40">
            <Loader2 size={18} className="animate-spin" />
            <span className="font-body text-sm">{p.t.loadingSites}</span>
          </div>
        ) : p.projects.length === 0 ? (
          <p className="text-center font-body text-sm text-charcoal/40 py-4">{p.t.noSites}</p>
        ) : (
          <div className="space-y-2">
            {p.projects.map(pr => (
              <button key={pr.id} onClick={() => p.onPickProject(pr.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 border transition-all duration-150 text-start ${p.selectedProjectId === pr.id ? "border-accent bg-accent/5 text-accent" : "border-charcoal/15 bg-white hover:border-accent/50 text-charcoal"}`}>
                <Building2 size={18} strokeWidth={1.5} className="shrink-0" />
                <p className="font-heading text-sm font-semibold truncate flex-1">{pr.name}</p>
              </button>
            ))}
          </div>
        )}
        <button onClick={p.onReset}
          className="font-body text-xs text-charcoal/30 hover:text-charcoal/60 transition-colors duration-200 underline underline-offset-2 w-full text-center">
          {p.t.changeNumber}
        </button>
      </div>
    </Screen>
  );
}
