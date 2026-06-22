"use client";

// BoardColumn — a single droppable column on the assignment board.
// Three kinds:
//   • real project (id = "project:<uuid>")
//   • manual project (id = "manual:<name>")
//   • unassigned pool   (id = "__unassigned__")
// All three share the same droppable container; the parent tells
// onDragEnd what to do with the drop based on the column id.

import { useDroppable } from "@dnd-kit/core";
import { Building2, Users } from "lucide-react";
import BoardCard, { type BoardCardData } from "./BoardCard";

interface Props {
  id: string;
  title: string;
  /** Workers/manual-rows that belong in this column. */
  cards: BoardCardData[];
  /** Distinguishes the unassigned pool from project columns for styling
   *  and to suppress the "manual entries" affordances. */
  variant: "project" | "manual_project" | "unassigned";
  onRemoveCard?: (data: BoardCardData) => void;
}

export default function BoardColumn({ id, title, cards, variant, onRemoveCard }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { columnId: id, variant } });

  const headerIcon = variant === "unassigned"
    ? <Users size={14} strokeWidth={1.5} className="text-charcoal/45 shrink-0" />
    : <Building2 size={14} strokeWidth={1.5} className={variant === "manual_project" ? "text-amber-500 shrink-0" : "text-accent shrink-0"} />;

  const containerCls = `flex flex-col rounded-md border bg-bone-dark/40 transition-colors min-h-[180px] ${
    isOver
      ? "border-accent bg-accent/5 ring-2 ring-accent/30"
      : variant === "unassigned"
        ? "border-charcoal/15"
        : variant === "manual_project"
          ? "border-amber-300/50"
          : "border-charcoal/10"
  }`;

  return (
    <div ref={setNodeRef} className={containerCls}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-charcoal/10">
        {headerIcon}
        <p className="font-heading text-sm font-bold text-charcoal truncate flex-1">{title}</p>
        <span className="font-body text-xs text-charcoal/45 tabular-nums shrink-0">{cards.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-1.5">
        {cards.length === 0 ? (
          <p className="text-center font-body text-[0.7rem] text-charcoal/35 py-6">
            {variant === "unassigned" ? "כל העובדים משובצים" : "גרור עובד לכאן"}
          </p>
        ) : (
          cards.map((c) => <BoardCard key={c.id} data={c} onRemove={onRemoveCard} />)
        )}
      </div>
    </div>
  );
}
