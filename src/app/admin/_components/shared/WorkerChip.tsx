"use client";

// WorkerChip — compact worker pill used everywhere on the redesigned
// board (unassigned strip + site cards). Two interaction modes coexist:
//
// • Drag (desktop, fine pointer): the whole chip is a draggable handle
//   via dnd-kit. PointerSensor's activation distance keeps a quick tap
//   from triggering a drag — onClick still fires on plain taps.
// • Tap (mobile, coarse pointer): the parent passes `onTap`; whenever
//   the user taps the chip without dragging, we call it so the parent
//   can open MoveToDialog. Tap also works on desktop as a fallback for
//   accessibility (keyboard/Enter).
//
// The chip stays purely presentational — it doesn't know which mode is
// active. The parent picks listeners + handlers based on
// useCoarsePointer.

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { UserRound, X } from "lucide-react";

export interface WorkerChipData {
  id: string;
  /** Worker name (existing meaning, kept for source-stability across
   *  consumers). The new badge text lives on `tag`. */
  label: string;
  /** Short free-text badge from staff.label — profession / source /
   *  temporary marker. NULL → no badge rendered. */
  tag?: string | null;
  isManual: boolean;
  assignmentId?: string | null;
}

interface Props {
  data: WorkerChipData;
  /** Tap handler — wired by the parent. Receives the chip data so the
   *  same handler can serve both unassigned-strip and site-card chips. */
  onTap?: (data: WorkerChipData) => void;
  /** Remove the chip from the board (manual cards only). */
  onRemove?: (data: WorkerChipData) => void;
  /** When true, drag listeners are skipped — only tap remains. Used in
   *  mobile mode so a touch+slide can scroll the strip instead of
   *  starting a drag operation. */
  disableDrag?: boolean;
}

export default function WorkerChip({ data, onTap, onRemove, disableDrag }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: data.id,
    data,
    disabled: disableDrag,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto",
    touchAction: disableDrag ? "auto" : "none",
  };

  // The chip is its own clickable button so screen-readers + keyboard
  // users get proper semantics. dnd-kit listeners go on the same node
  // and only kick in once activation distance is crossed.
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disableDrag ? {} : listeners)}
      {...attributes}
      onClick={() => onTap?.(data)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap?.(data); } }}
      role="button"
      tabIndex={0}
      className={`group relative flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 shadow-sm transition-colors select-none ${
        disableDrag ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${
        data.isManual
          ? "border-amber-300/70 hover:border-amber-400"
          : "border-charcoal/12 hover:border-accent/50"
      }`}
    >
      <UserRound
        size={12}
        strokeWidth={1.5}
        className={`shrink-0 ${data.isManual ? "text-amber-500" : "text-charcoal/60"}`}
      />
      <span className="font-body text-xs font-semibold text-charcoal truncate max-w-[120px]">{data.label}</span>
      {data.tag && (
        <span className="font-body text-[0.6rem] text-charcoal/65 px-1 py-0.5 rounded bg-charcoal/[0.06] shrink-0 max-w-[80px] truncate">{data.tag}</span>
      )}
      {data.isManual && (
        <span className="font-body text-[0.6rem] text-amber-600 px-1 py-0.5 rounded bg-amber-50 shrink-0">ידני</span>
      )}
      {onRemove && data.isManual && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(data); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-charcoal/30 hover:text-red-500 shrink-0"
          aria-label="הסר כרטיס"
        >
          <X size={11} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
