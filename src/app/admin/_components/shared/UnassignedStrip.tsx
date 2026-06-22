"use client";

// UnassignedStrip — horizontal pool of workers who aren't assigned to
// any site. Sits above the SiteCard grid so it stays visible no matter
// which site the admin is targeting. Internal horizontal scroll when
// the pool overflows the strip width.

import { useDroppable } from "@dnd-kit/core";
import { Users } from "lucide-react";
import WorkerChip, { type WorkerChipData } from "./WorkerChip";

interface Props {
  id: string;
  cards: WorkerChipData[];
  tapMode: boolean;
  onChipTap?: (data: WorkerChipData) => void;
}

export default function UnassignedStrip({ id, cards, tapMode, onChipTap }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { columnId: id, variant: "unassigned" } });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-bone-dark/40 transition-colors ${
        isOver ? "border-accent ring-2 ring-accent/30 bg-accent/5" : "border-charcoal/15"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-charcoal/10">
        <Users size={14} strokeWidth={1.5} className="text-charcoal/60 shrink-0" />
        <p className="font-heading text-sm font-bold text-charcoal flex-1">לא משובצים</p>
        <span className="font-body text-xs text-charcoal/60 tabular-nums shrink-0 bg-charcoal/5 rounded-full px-2 py-0.5">
          {cards.length}
        </span>
      </div>

      <div className="p-2.5">
        {cards.length === 0 ? (
          <p className="text-center font-body text-[0.7rem] text-charcoal/35 py-3">כל העובדים משובצים 🎉</p>
        ) : (
          // Wrap inside the strip — the pool fills row by row and the
          // host container's natural vertical scroll handles overflow.
          // This reads better than horizontal scroll on phones since
          // the user can see every name at once instead of swiping.
          <div className="flex flex-wrap gap-1.5">
            {cards.map((c) => (
              <WorkerChip
                key={c.id}
                data={c}
                onTap={onChipTap}
                disableDrag={tapMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
