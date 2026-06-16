"use client";

// The "ייתכן כפול" chip, actionable anywhere it appears. Clicking it opens the
// shared duplicate-compare dialog (current doc vs the suspected original) with
// the same delete / clear-flag / close actions as the review screen — via
// useDuplicateCompare, so no logic is duplicated.
//
// The dialog is portaled to <body> so that when the chip lives inside a card
// <Link> (the inbox), dialog clicks never bubble into the link's navigation.

import { useState } from "react";
import { createPortal } from "react-dom";
import { Copy } from "lucide-react";
import type { DocRow } from "./labels";
import { useDuplicateCompare } from "./useDuplicateCompare";

export default function DuplicateChip({ doc, onDeleted, onCleared }: {
  doc: DocRow;
  onDeleted?: () => void;
  onCleared?: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const { openCompare, dialog } = useDuplicateCompare({
    onDeleted: () => onDeleted?.(),
    onCleared: () => onCleared?.(),
    onError: setErr,
  });

  if (!doc.possible_duplicate_of) return null;

  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        title="ייתכן כפילות של מסמך קיים — לחץ להשוואה והכרעה"
        onClick={(e) => { stop(e); setErr(null); openCompare(doc); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { stop(e); setErr(null); openCompare(doc); } }}
        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer"
      >
        <Copy size={11} /> ייתכן כפול
      </span>
      {err && <span className="text-[0.65rem] text-red-600">{err}</span>}
      {dialog && typeof document !== "undefined" && createPortal(dialog, document.body)}
    </>
  );
}
