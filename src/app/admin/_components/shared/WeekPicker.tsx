"use client";

/**
 * WeekPicker — back / forward / "today" controls for the Sunday-of-week
 * date that drives the weekly worker-schedule view.
 *
 * Stateless: the parent owns `sunday` and supplies `onChange`. All week
 * math is delegated to src/lib/israel-week so the matrix view and the
 * schedule UI compute "next week" the same way.
 *
 * RTL — the chevron arrows are flipped so "previous week" sits on the
 * right and "next week" on the left, matching how Hebrew users read a
 * timeline.
 */

import { ChevronRight, ChevronLeft, Calendar } from "lucide-react";
import { addWeeks, getSundayLocal, weekLabel } from "../../../../lib/israel-week";

interface Props {
  /** YYYY-MM-DD of the displayed week's Sunday. */
  sunday: string;
  onChange: (sunday: string) => void;
}

export default function WeekPicker({ sunday, onChange }: Props) {
  const todaySunday = getSundayLocal(new Date());
  const isCurrentWeek = sunday === todaySunday;

  return (
    <div className="flex items-center justify-between gap-2 bg-white border border-warm-gray-light rounded-md px-3 py-2">
      {/* Previous week — RTL: arrow points right (toward the past, in Hebrew). */}
      <button
        type="button"
        onClick={() => onChange(addWeeks(sunday, -1))}
        aria-label="שבוע קודם"
        className="flex items-center justify-center w-8 h-8 text-charcoal/65 hover:text-accent hover:bg-bone rounded transition-colors"
      >
        <ChevronRight size={18} strokeWidth={1.5} />
      </button>

      <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
        <Calendar size={14} strokeWidth={1.5} className="text-accent shrink-0" />
        <p className="font-heading text-sm font-bold text-charcoal text-center tabular-nums truncate">
          {weekLabel(sunday)}
        </p>
        {!isCurrentWeek && (
          <button
            type="button"
            onClick={() => onChange(todaySunday)}
            className="text-[0.7rem] text-accent border border-accent/40 px-2 py-0.5 rounded hover:bg-accent hover:text-bone transition-colors shrink-0"
          >
            לשבוע הנוכחי
          </button>
        )}
      </div>

      {/* Next week — RTL: arrow points left (toward the future, in Hebrew). */}
      <button
        type="button"
        onClick={() => onChange(addWeeks(sunday, 1))}
        aria-label="שבוע הבא"
        className="flex items-center justify-center w-8 h-8 text-charcoal/65 hover:text-accent hover:bg-bone rounded transition-colors"
      >
        <ChevronLeft size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}
