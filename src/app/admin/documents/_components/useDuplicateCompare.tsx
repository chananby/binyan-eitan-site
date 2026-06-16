"use client";

// Shared duplicate-compare logic, extracted from ReviewQueueClient so the
// "ייתכן כפול" chip can open the same compare dialog everywhere (inbox card,
// detail screen) without re-implementing the fetch/delete/clear flow.
//
// The hook owns: the compare state, fetching the suspected original, the
// DELETE-as-duplicate and clear-flag actions, and the rendered dialog node.
// Each screen supplies its own post-action callbacks (onDeleted / onCleared)
// so screen-specific behaviour — the review queue advancing with slice(1),
// the inbox re-fetching, the detail navigating away — stays in the screen.

import { useState } from "react";
import DuplicateCompareDialog, { paneFromDoc } from "./DuplicateCompareDialog";
import type { DocRow } from "./labels";

interface Options {
  onDeleted?: (current: DocRow) => void;   // after a successful delete-as-duplicate
  onCleared?: (current: DocRow) => void;   // after the flag was cleared
  onError?: (msg: string) => void;
}

export function useDuplicateCompare(opts: Options = {}) {
  const [compare, setCompare] = useState<{ current: DocRow; suspected: DocRow } | null>(null);
  const [busy, setBusy] = useState(false);
  const fail = (m: string) => opts.onError?.(m);

  // Fetch the suspected original via the existing GET and open the dialog.
  async function openCompare(current: DocRow) {
    if (!current.possible_duplicate_of) return;
    try {
      const d = await fetch(`/api/admin/documents/${current.possible_duplicate_of}`, { cache: "no-store" }).then(r => r.json());
      if (d?.document) setCompare({ current, suspected: d.document });
      else fail("המסמך החשוד לא נמצא (ייתכן שנמחק)");
    } catch (e) { fail(String(e)); }
  }

  function closeCompare() { setCompare(null); }

  async function confirmDelete() {
    if (!compare) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/documents/${compare.current.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); fail(d.error ?? "מחיקה נכשלה"); return; }
      const current = compare.current;
      setCompare(null);
      opts.onDeleted?.(current);
    } catch (e) { fail(String(e)); }
    finally { setBusy(false); }
  }

  async function confirmClear() {
    if (!compare) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/documents/${compare.current.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ possible_duplicate_of: null }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); fail(d.error ?? "ניקוי הדגל נכשל"); return; }
      const current = compare.current;
      setCompare(null);
      opts.onCleared?.(current);
    } catch (e) { fail(String(e)); }
    finally { setBusy(false); }
  }

  // The dialog node — identical config everywhere, rendered from one place.
  const dialog = compare ? (
    <DuplicateCompareDialog
      title="השוואת כפילות אפשרית"
      subtitle="המסמך הנוכחי מול מסמך קיים שזוהה כדומה. הכרע:"
      left={paneFromDoc(compare.suspected, "מסמך קיים")}
      right={paneFromDoc(compare.current, "המסמך הנוכחי")}
      busy={busy}
      actions={[
        { key: "close", label: "סגור", variant: "neutral" },
        { key: "clear", label: "לא כפול — נקה דגל", variant: "outline" },
        { key: "delete", label: "מחק את הנוכחי ככפול", variant: "danger" },
      ]}
      onAction={(k) => {
        if (k === "close") closeCompare();
        else if (k === "clear") confirmClear();
        else if (k === "delete") confirmDelete();
      }}
    />
  ) : null;

  return { compare, busy, openCompare, closeCompare, confirmDelete, confirmClear, dialog };
}
