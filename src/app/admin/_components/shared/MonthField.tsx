"use client";

/**
 * MonthField — RTL-friendly wrapper around <input type="month">.
 *
 * The native month picker renders its own dropdown grid + year navigation
 * LTR regardless of dir="rtl", which is where the visible bug lives. We
 * can't restyle the browser widget, so we surround the input with our own
 * step chevrons. Almost all navigation is a click-away on the chevrons,
 * and the native widget remains available (click the value itself) for
 * jumping to a far year.
 *
 * Chevron convention — matches WeekPicker.tsx exactly:
 *   ChevronRight (►)  = previous month  (backwards in Hebrew reading time)
 *   ChevronLeft  (◄)  = next month      (forwards in Hebrew reading time)
 *
 * The input still receives dir="ltr" because its value ("2026-07") is
 * calendar data — LTR is correct there and it prevents Chrome from
 * reversing the digits inside the box.
 */

import { ChevronRight, ChevronLeft } from "lucide-react";

interface Props {
  /** "YYYY-MM". Empty string is allowed but the chevrons no-op until set. */
  value: string;
  onChange: (v: string) => void;
  /** Optional cap — most callers restrict to <= currentMonth() so admins
   *  don't step forward past today. Skipped when omitted. */
  max?: string;
  min?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

// Step a "YYYY-MM" by ±1 month with correct year rollover
// (Jan − 1 = Dec of prior year; Dec + 1 = Jan of next year).
function stepMonth(ym: string, delta: -1 | 1): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [yStr, mStr] = ym.split("-");
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) + delta;
  if (m < 1)  { m = 12; y -= 1; }
  if (m > 12) { m = 1;  y += 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export default function MonthField({
  value,
  onChange,
  max,
  min,
  className = "",
  disabled = false,
  ...rest
}: Props) {
  const prev = value ? stepMonth(value, -1) : "";
  const next = value ? stepMonth(value, +1) : "";
  const canGoPrev = !disabled && !!prev && (!min || prev >= min);
  const canGoNext = !disabled && !!next && (!max || next <= max);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Previous — RTL: chevron RIGHT sits on the right (backwards in time) */}
      <button
        type="button"
        onClick={() => canGoPrev && onChange(prev)}
        disabled={!canGoPrev}
        aria-label="חודש קודם"
        className="flex items-center justify-center w-8 h-8 shrink-0 text-charcoal/65 hover:text-accent hover:bg-bone rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} strokeWidth={1.75} />
      </button>

      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={max}
        min={min}
        disabled={disabled}
        dir="ltr"
        className="flex-1 min-w-0 border border-warm-gray-light bg-white text-charcoal text-sm px-3 py-2 focus:outline-none focus:border-accent disabled:opacity-40 text-center tabular-nums"
        aria-label={rest["aria-label"]}
      />

      {/* Next — RTL: chevron LEFT sits on the left (forwards in time) */}
      <button
        type="button"
        onClick={() => canGoNext && onChange(next)}
        disabled={!canGoNext}
        aria-label="חודש הבא"
        className="flex items-center justify-center w-8 h-8 shrink-0 text-charcoal/65 hover:text-accent hover:bg-bone rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}
