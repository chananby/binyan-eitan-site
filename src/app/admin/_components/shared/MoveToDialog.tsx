"use client";

// MoveToDialog — mobile (tap-to-move) target picker. Opens when a
// WorkerChip is tapped on a coarse-pointer device. Lists every real
// site + every existing manual site, plus "Unassigned" as the explicit
// way to remove a worker from the board without dragging.
//
// Selecting a target calls `onPick(columnId)` — the parent decodes the
// id back to project_id / project_name / unassigned and PUTs the
// matching action. Same encoding as BoardTab's column ids.

import { useEffect } from "react";
import { X, Building2, Users } from "lucide-react";
import { type WorkerChipData } from "./WorkerChip";

export interface MoveTarget {
  id: string;                          // encoded column id ("project:<uuid>" / "manual:<name>" / "__unassigned__")
  label: string;
  variant: "project" | "manual_project" | "unassigned";
}

interface Props {
  open: boolean;
  worker: WorkerChipData | null;
  /** Targets to choose from. The parent prepares them. */
  targets: MoveTarget[];
  /** Optional: the column id the worker currently sits in — we hide it
   *  from the list so tapping it isn't a wasted PUT. */
  currentColumnId?: string | null;
  onPick: (target: MoveTarget) => void;
  onClose: () => void;
}

export default function MoveToDialog(p: Props) {
  // ESC closes — registered only while open so background pages don't
  // intercept the key when the dialog isn't on screen.
  useEffect(() => {
    if (!p.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") p.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.open, p.onClose]);

  if (!p.open || !p.worker) return null;

  const visibleTargets = p.targets.filter((t) => t.id !== p.currentColumnId);

  return (
    <div
      className="fixed inset-0 z-50 bg-charcoal/55 flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={p.onClose}
      role="dialog"
      aria-modal="true"
      aria-label="העבר עובד"
    >
      <div
        className="bg-bone rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal/10">
          <div className="min-w-0">
            <p className="font-body text-[0.7rem] text-charcoal/70 leading-none">העבר את</p>
            <p className="font-heading text-base font-bold text-charcoal truncate">{p.worker.label}</p>
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
          {visibleTargets.length === 0 ? (
            <p className="text-center text-sm text-charcoal/60 py-6">אין יעדים זמינים</p>
          ) : (
            visibleTargets.map((t) => {
              const icon = t.variant === "unassigned"
                ? <Users size={14} strokeWidth={1.5} className="text-charcoal/60 shrink-0" />
                : <Building2
                    size={14} strokeWidth={1.5}
                    className={t.variant === "manual_project" ? "text-amber-500 shrink-0" : "text-accent shrink-0"}
                  />;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => p.onPick(t)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md border bg-white transition-colors text-start ${
                    t.variant === "unassigned"
                      ? "border-charcoal/15 hover:border-charcoal/40 hover:bg-charcoal/5"
                      : t.variant === "manual_project"
                        ? "border-amber-300/60 hover:border-amber-500 hover:bg-amber-50"
                        : "border-charcoal/15 hover:border-accent hover:bg-accent/5"
                  }`}
                >
                  {icon}
                  <span className="font-body text-sm font-semibold text-charcoal flex-1 truncate">{t.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
