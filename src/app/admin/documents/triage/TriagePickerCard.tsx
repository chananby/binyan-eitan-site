"use client";

// Single-project picker card for the triage side panel: quick-pick chips
// for active sites + overhead, a full ProjectSelect underneath, and the
// "פצל בין פרויקטים" toggle that flips the panel into split mode.
//
// Extracted from TriageClient so that file stays under the 400-line
// project ceiling. Purely presentational — every button calls back into
// TriageClient's state (assign, splitMode, error, savingId).

import { Loader2, AlertCircle, Building2, Briefcase, Scissors } from "lucide-react";
import ProjectSelect, { type ProjectOption } from "../_components/ProjectSelect";

export default function TriagePickerCard({
  activeSites,
  overheadChip,
  allProjects,
  savingId,
  error,
  onAssign,
  onEnterSplitMode,
}: {
  activeSites: ProjectOption[];
  overheadChip: ProjectOption | undefined;
  allProjects: ProjectOption[];
  savingId: string | null;
  error: string | null;
  onAssign: (projectId: string) => void;
  onEnterSplitMode: () => void;
}) {
  return (
    <div className="bg-white border border-charcoal/10 rounded-md shadow-[0_1px_3px_rgba(45,41,38,0.06),0_1px_2px_rgba(45,41,38,0.04)] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-muted">שייך לפרויקט</p>
        <button
          type="button"
          onClick={onEnterSplitMode}
          disabled={!!savingId}
          className="inline-flex items-center gap-1 text-caption font-semibold text-accent hover:text-accent-dark disabled:opacity-40"
          title="פצל את הסכום בין כמה פרויקטים"
        >
          <Scissors size={12} /> פצל בין פרויקטים
        </button>
      </div>

      {/* Quick-pick chips */}
      {(activeSites.length > 0 || overheadChip) && (
        <div className="flex flex-wrap gap-1.5">
          {activeSites.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onAssign(p.id)}
              disabled={!!savingId}
              className="inline-flex items-center gap-1 text-caption font-semibold border border-accent/40 text-accent bg-white px-2.5 py-1 rounded hover:bg-accent/5 disabled:opacity-40 transition-colors"
              title={`שייך ל-${p.name}`}
            >
              <Building2 size={11} strokeWidth={2} /> {p.name}
            </button>
          ))}
          {overheadChip && (
            <button
              type="button"
              onClick={() => onAssign(overheadChip.id)}
              disabled={!!savingId}
              className="inline-flex items-center gap-1 text-caption font-semibold border border-charcoal/30 text-charcoal bg-bone/40 px-2.5 py-1 rounded hover:bg-bone disabled:opacity-40 transition-colors"
              title="שייך לתקורות (הוצאות כלליות)"
            >
              <Briefcase size={11} strokeWidth={2} /> תקורות
            </button>
          )}
        </div>
      )}

      {/* Full dropdown — for any project not in the quick chips */}
      <ProjectSelect
        value=""
        onChange={(v) => v && onAssign(v)}
        projects={allProjects}
        emptyLabel="— או בחר מתוך הרשימה המלאה —"
        className="w-full text-content border border-charcoal/25 bg-white px-3 py-2 rounded focus:border-accent focus:outline-none disabled:opacity-40"
      />

      {savingId && (
        <p className="flex items-center gap-1.5 text-caption text-muted">
          <Loader2 size={11} className="animate-spin" /> שומר…
        </p>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-caption text-red-600 font-semibold">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}
