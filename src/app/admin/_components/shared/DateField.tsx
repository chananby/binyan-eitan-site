"use client";

/**
 * DateField — RTL-friendly day-granularity picker for admin surfaces.
 *
 * Native `<input type="date">` was the previous choice on the worker
 * history panel, but its browser-drawn spinner + popup carry vertical
 * up/down arrows whose meaning is fixed by the browser (↑ increments
 * the focused segment = forward in time, ↓ decrements = back). That
 * fights the Hebrew reading of a timeline where "back in time" sits
 * on the right, "forward" on the left. We can't restyle the browser
 * widget, so this component removes it entirely and provides the
 * same horizontal-chevron convention MonthField and WeekPicker use.
 *
 * Chevron convention — matches MonthField.tsx and WeekPicker.tsx:
 *   ChevronRight (►)  = previous day  (backwards in Hebrew reading time)
 *   ChevronLeft  (◄)  = next day      (forwards in Hebrew reading time)
 *
 * The text input stays editable so the admin can type any date directly
 * (chevrons for ±1 day nudges, typing for larger jumps). Local state
 * absorbs keystrokes and only commits to the parent on blur / Enter,
 * so a partial "2026-" doesn't fire a data-fetch on every character.
 * A malformed value on blur reverts to the last valid `value`.
 */

import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface Props {
  /** "YYYY-MM-DD". Empty string is allowed but the chevrons no-op until set. */
  value: string;
  onChange: (v: string) => void;
  /** Optional caps — most callers restrict `to <= today`. Skipped when omitted. */
  max?: string;
  min?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Step a "YYYY-MM-DD" by ±1 day (UTC-noon anchored to dodge DST seams). */
function stepDay(ymd: string, delta: -1 | 1): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function DateField({
  value,
  onChange,
  max,
  min,
  className = "",
  disabled = false,
  ...rest
}: Props) {
  // Local buffer so partial typing doesn't leak into the parent's fetch
  // dependencies. Reset whenever the parent hands us a new value (quick
  // shortcuts like "החודש הזה" flow through this path).
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  const prev = value ? stepDay(value, -1) : "";
  const next = value ? stepDay(value, +1) : "";
  const canGoPrev = !disabled && !!prev && (!min || prev >= min);
  const canGoNext = !disabled && !!next && (!max || next <= max);

  function commit() {
    if (text === value) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) { setText(value); return; }
    if (min && text < min) { setText(value); return; }
    if (max && text > max) { setText(value); return; }
    onChange(text);
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Previous day — RTL: chevron RIGHT sits on the right (backwards in time) */}
      <button
        type="button"
        onClick={() => canGoPrev && onChange(prev)}
        disabled={!canGoPrev}
        aria-label="יום קודם"
        className="flex items-center justify-center w-8 h-8 shrink-0 text-charcoal/65 hover:text-accent hover:bg-bone rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} strokeWidth={1.75} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
        placeholder="YYYY-MM-DD"
        maxLength={10}
        disabled={disabled}
        dir="ltr"
        className="flex-1 min-w-0 border border-warm-gray-light bg-white text-charcoal text-sm px-3 py-2 focus:outline-none focus:border-accent disabled:opacity-40 text-center tabular-nums"
        aria-label={rest["aria-label"]}
      />

      {/* Next day — RTL: chevron LEFT sits on the left (forwards in time) */}
      <button
        type="button"
        onClick={() => canGoNext && onChange(next)}
        disabled={!canGoNext}
        aria-label="יום הבא"
        className="flex items-center justify-center w-8 h-8 shrink-0 text-charcoal/65 hover:text-accent hover:bg-bone rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}
