"use client";

// SiteCard — single project tile on the redesigned board grid.
//
// Behaves as a useDroppable target so a desktop drag lands on it. The
// body lays workers out as wrapping WorkerChip pills (small enough that
// up to 8 fit without the card blowing up in height).
//
// Two variants:
// • "project" — real project from `projects` table. Removable cards only
//   apply to manual entries inside (real workers leave via drag/tap).
// • "manual_project" — a free-text site label; uses an amber accent so
//   the admin can spot it among real sites.

import { useDroppable } from "@dnd-kit/core";
import { Building2 } from "lucide-react";
import WorkerChip, { type WorkerChipData } from "./WorkerChip";

interface Props {
  id: string;
  title: string;
  cards: WorkerChipData[];
  variant: "project" | "manual_project";
  /** When true, chips inside this card are tap-only (parent decides). */
  tapMode: boolean;
  onChipTap?: (data: WorkerChipData) => void;
  onChipRemove?: (data: WorkerChipData) => void;
}

export default function SiteCard({ id, title, cards, variant, tapMode, onChipTap, onChipRemove }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { columnId: id, variant } });

  const baseCls =
    "flex flex-col rounded-lg border bg-white shadow-sm transition-colors min-h-[140px]";
  const variantCls = isOver
    ? "border-accent ring-2 ring-accent/30 bg-accent/5"
    : variant === "manual_project"
      ? "border-amber-300/60"
      : "border-charcoal/15";

  return (
    <div ref={setNodeRef} className={`${baseCls} ${variantCls}`}>
      {/* Header: site name + worker count */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-charcoal/10">
        <Building2
          size={14}
          strokeWidth={1.5}
          className={variant === "manual_project" ? "text-amber-500 shrink-0" : "text-accent shrink-0"}
        />
        <p className="font-heading text-sm font-bold text-charcoal truncate flex-1">
          {title}
          {variant === "manual_project" && <span className="font-body text-[0.7rem] text-amber-600"> (ידני)</span>}
        </p>
        <span className="font-body text-xs text-charcoal/60 tabular-nums shrink-0 bg-charcoal/5 rounded-full px-2 py-0.5">{cards.length}</span>
      </div>

      {/* Body: wrapping chips, or empty hint */}
      <div className="flex-1 p-2.5">
        {cards.length === 0 ? (
          <p className="text-center font-body text-[0.7rem] text-charcoal/35 py-5">
            {tapMode ? "הקש על עובד כדי לשבץ" : "גרור עובד לכאן"}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {cards.map((c) => (
              <WorkerChip
                key={c.id}
                data={c}
                onTap={onChipTap}
                onRemove={onChipRemove}
                disableDrag={tapMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
