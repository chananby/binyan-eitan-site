"use client";

import { useEffect, useRef } from "react";

interface AutoGrowTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  dir?: "rtl" | "ltr" | "auto";
  maxLength?: number;
  autoFocus?: boolean;
  name?: string;
  inputMode?: "text" | "email" | "tel" | "url" | "search";
  // Initial visible rows before content arrives (1 by default — the field
  // grows from a single line). Most call sites should leave this alone.
  rows?: number;
}

/**
 * A textarea that auto-grows vertically with its content.
 *
 * Drop-in replacement for `<input type="text">` in forms where the entered
 * value can exceed one row's worth of width (names, addresses, item
 * descriptions, etc.). Behavior:
 *   - Starts at one line, grows as the user types, shrinks when content
 *     is removed.
 *   - Enter inserts a newline (standard textarea), unlike <input> which
 *     submits the form on Enter. If the surrounding form relies on Enter
 *     to submit, use a regular <input> instead.
 *   - resize: none + overflow: hidden — no scrollbar, no manual drag handle.
 *
 * Shares the same look as the codebase's `INPUT` constant (border, bg, etc.)
 * via the className prop passed in. The component adds `resize-none
 * overflow-hidden` and a sensible line-height.
 */
export function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  required,
  disabled,
  className,
  dir,
  maxLength,
  autoFocus,
  name,
  inputMode,
  rows = 1,
}: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reset to auto so scrollHeight can shrink when content is deleted,
    // then size to fit. +2 absorbs sub-pixel rounding (no scrollbar flicker).
    el.style.height = "auto";
    el.style.height = el.scrollHeight + 2 + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      dir={dir}
      maxLength={maxLength}
      autoFocus={autoFocus}
      name={name}
      inputMode={inputMode}
      rows={rows}
      className={`${className ?? ""} resize-none overflow-hidden leading-snug`}
    />
  );
}
