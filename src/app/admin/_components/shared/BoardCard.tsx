"use client";

// BoardCard — a single draggable worker card on the assignment board.
// Wraps useDraggable so the whole card surface is the drag handle. The
// card is also used inside the "Unassigned" column; the only thing that
// changes between contexts is the parent's column id, which we pass via
// the data payload so onDragEnd knows where the card came from.

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { UserRound, X } from "lucide-react";

export interface BoardCardData {
  /** Stable drag id — see BoardTab for the encoding. */
  id: string;
  /** Display label (worker name from staff or the manual worker_name). */
  label: string;
  /** Optional role badge ("עובד" / "ממונה"). */
  role?: string | null;
  /** True for manual rows (board_assignments.worker_id IS NULL). */
  isManual: boolean;
  /** The assignment row id — only present when this card sits on a
   *  project column (not for unassigned real workers). Used by
   *  unassign_row when an admin removes a manual card. */
  assignmentId?: string | null;
}

interface Props {
  data: BoardCardData;
  /** Called when the admin clicks the × badge on a card. */
  onRemove?: (data: BoardCardData) => void;
}

export default function BoardCard({ data, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: data.id,
    data,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    // dnd-kit suggests opacity/z-index to keep the dragged card visually on
    // top. Without it the card drops behind sibling columns mid-drag.
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto",
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none", // PointerSensor + TouchSensor reliability on mobile
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative flex items-center gap-2 rounded-md border bg-white px-2.5 py-2 shadow-sm transition-colors ${
        data.isManual
          ? "border-amber-300/60 hover:border-amber-400"
          : "border-charcoal/10 hover:border-accent/50"
      }`}
    >
      <UserRound
        size={14}
        strokeWidth={1.5}
        className={data.isManual ? "text-amber-500 shrink-0" : "text-charcoal/40 shrink-0"}
      />
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm font-semibold text-charcoal truncate">{data.label}</p>
        {data.role && !data.isManual && (
          <p className="font-body text-[0.65rem] text-charcoal/60">{data.role}</p>
        )}
        {data.isManual && (
          <p className="font-body text-[0.65rem] text-amber-600">ידני</p>
        )}
      </div>
      {/* Remove button — only meaningful for manual cards (real workers
          go back to "Unassigned" via drag, not deletion). pointerDown
          stops the drag listener from grabbing the click. */}
      {onRemove && data.isManual && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(data)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-charcoal/30 hover:text-red-500"
          aria-label="הסר כרטיס"
        >
          <X size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
