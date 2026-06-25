"use client";

/**
 * AssignCellDialog — pick a project (or clear) for a single (worker,
 * day) cell in the weekly schedule. Mirrors MoveToDialog 1:1 — bottom
 * sheet on mobile (items-end), centered modal on sm+ (items-center).
 *
 * Targets:
 *   real projects + persistent manual_projects + "ללא שיבוץ" sentinel
 *   that maps to a DELETE on the parent side.
 *
 * The currently-selected target (if any) is highlighted but still
 * clickable — choosing it again is a no-op the parent quietly
 * dismisses.
 */

import { useEffect } from "react";
import { X, Building2, Trash2 } from "lucide-react";

export type CellPick =
  | { kind: "real";   id: string;   label: string }
  | { kind: "manual"; name: string; label: string }
  | { kind: "clear" };

interface ProjectRef       { id: string; name: string }
interface ManualProjectRef { id: string; name: string }

interface Props {
  open: boolean;
  /** Display title — e.g. "אבי לוי · יום ראשון 12.7". */
  workerName: string;
  dayLabel: string;
  projects: ProjectRef[];
  manualProjects: ManualProjectRef[];
  /** The cell's current value, so we can highlight it. */
  currentProjectId?: string | null;
  currentProjectName?: string | null;
  onPick: (pick: CellPick) => void;
  onClose: () => void;
}

export default function AssignCellDialog(p: Props) {
  useEffect(() => {
    if (!p.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") p.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.open, p.onClose]);

  if (!p.open) return null;

  const isCurrentReal   = (id: string)   => !!p.currentProjectId   && p.currentProjectId   === id;
  const isCurrentManual = (name: string) => !!p.currentProjectName && p.currentProjectName === name;

  return (
    <div
      className="fixed inset-0 z-50 bg-charcoal/55 flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={p.onClose}
      role="dialog"
      aria-modal="true"
      aria-label="שיבוץ עובד ליום"
    >
      <div
        className="bg-bone rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal/10">
          <div className="min-w-0">
            <p className="font-body text-xs text-charcoal/70 leading-none">שיבוץ</p>
            <p className="font-heading text-base font-bold text-charcoal truncate">
              {p.workerName} · {p.dayLabel}
            </p>
          </div>
          <button
            onClick={p.onClose}
            className="p-1 text-charcoal/65 hover:text-charcoal/80 transition-colors shrink-0"
            aria-label="סגור"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Target list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {p.projects.length === 0 && p.manualProjects.length === 0 && (
            <p className="text-center text-sm text-charcoal/60 py-6">אין אתרים פעילים</p>
          )}

          {p.projects.map((proj) => {
            const isCurrent = isCurrentReal(proj.id);
            return (
              <button
                key={"r-" + proj.id}
                type="button"
                onClick={() => p.onPick({ kind: "real", id: proj.id, label: proj.name })}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md border bg-white transition-colors text-start ${
                  isCurrent
                    ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                    : "border-charcoal/15 hover:border-accent hover:bg-accent/5"
                }`}
              >
                <Building2 size={14} strokeWidth={1.5} className="text-accent shrink-0" />
                <span className="font-body text-sm font-semibold text-charcoal flex-1 truncate">
                  {proj.name}
                </span>
                {isCurrent && <span className="text-[0.6rem] text-accent shrink-0">נוכחי</span>}
              </button>
            );
          })}

          {p.manualProjects.map((mp) => {
            const isCurrent = isCurrentManual(mp.name);
            return (
              <button
                key={"m-" + mp.id}
                type="button"
                onClick={() => p.onPick({ kind: "manual", name: mp.name, label: mp.name })}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md border bg-white transition-colors text-start ${
                  isCurrent
                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-300"
                    : "border-amber-300/60 hover:border-amber-500 hover:bg-amber-50"
                }`}
              >
                <Building2 size={14} strokeWidth={1.5} className="text-amber-500 shrink-0" />
                <span className="font-body text-sm font-semibold text-charcoal flex-1 truncate">
                  {mp.name}
                </span>
                <span className="font-body text-[0.6rem] text-amber-600 px-1 py-0.5 rounded bg-amber-100 shrink-0">
                  ידני
                </span>
                {isCurrent && <span className="text-[0.6rem] text-amber-700 shrink-0">נוכחי</span>}
              </button>
            );
          })}

          {/* "ללא שיבוץ" — only meaningful when there IS a current cell.
              Always render so admins know how to clear, but visually
              separated. */}
          <div className="pt-2 mt-2 border-t border-charcoal/10">
            <button
              type="button"
              onClick={() => p.onPick({ kind: "clear" })}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-charcoal/15 bg-white text-start hover:border-charcoal/40 hover:bg-charcoal/5 transition-colors"
            >
              <Trash2 size={14} strokeWidth={1.5} className="text-charcoal/60 shrink-0" />
              <span className="font-body text-sm font-semibold text-charcoal flex-1">ללא שיבוץ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
