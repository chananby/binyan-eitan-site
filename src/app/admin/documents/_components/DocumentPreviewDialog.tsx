"use client";

/**
 * DocumentPreviewDialog — lightweight lightbox for one financial
 * document, opened from the inbox card without navigating away from
 * the list. Mounted only while open so the /file fetch is lazy (we
 * never preload bytes for the whole inbox).
 *
 * Two work surfaces at the bottom, mutually exclusive:
 *   • Single-assign — DocumentProjectAssignBar (the historical
 *     surface), for docs that are unassigned or single-project.
 *     A "פצל" button flips into split-mode.
 *   • Multi-project split — DocumentSplitPanel, seeded from the
 *     document's live splits (fetched on open when hasSplits is
 *     true). A "בטל פיצול" button DELETEs every live split, drops
 *     back to single-assign mode.
 *
 * Save / delete paths hit the same POST + DELETE /splits endpoints
 * the triage flow uses. On success we invoke onChanged so the inbox
 * refreshes counts, list, AND the splitDocIds set — otherwise the
 * card's "🔀 מפוצל" badge stays stale until the next full reload.
 *
 * Closes on the X button, ESC, or a backdrop click. The inner area
 * stops propagation so clicks inside the document (incl. PDF
 * scrolling) don't dismiss it. Mirrors the fullscreen overlay
 * pattern already in DocumentPreview.tsx — same look so admins don't
 * learn a second modal.
 */

import { useEffect, useState } from "react";
import { X, FileText, Scissors, RotateCcw, Loader2 } from "lucide-react";
import type { DocRow } from "./labels";
import DocumentProjectAssignBar from "./DocumentProjectAssignBar";
import DocumentPreviewArea from "./DocumentPreviewArea";
import DocumentSplitPanel from "./DocumentSplitPanel";
import type { ProjectOption } from "./ProjectSelect";
import { fmtCurrency, fmtDate, displayVendor } from "./labels";

interface Props {
  doc: DocRow;
  /** Same prop the inbox card accepts. Omitting it hides the inline
   *  project bar — useful for read-only consumers. */
  projects?: ProjectOption[];
  /** True when this doc currently has live rows in
   *  document_project_splits. Drives the initial UI mode and the
   *  visibility of the "בטל פיצול" affordance. */
  hasSplits?: boolean;
  /** Callback after ANY successful mutation from inside this dialog:
   *  project assignment via the bar, split-save, or split-clear. The
   *  inbox uses it to refresh counts, the list, AND its splitDocIds set
   *  so the '🔀 מפוצל' badge is truthful on the next paint. */
  onChanged?: () => void;
  onClose: () => void;
}

interface LoadedSplit {
  project_id: string;
  amount: number;
}

export default function DocumentPreviewDialog({ doc, projects, hasSplits = false, onChanged, onClose }: Props) {
  // Still used for the "open in new tab" link in the title strip. The
  // actual preview body's mime-type branching now lives inside
  // DocumentPreviewArea — see the body further down.
  const fileUrl = `/api/admin/documents/${doc.id}/file`;

  // Split-mode is the primary state gate for the footer. It starts on
  // hasSplits — a split doc opens straight into the editor with its
  // rows filled in; an unsplit doc opens into the classic project bar.
  const [splitMode, setSplitMode] = useState(hasSplits);
  // Existing splits, fetched once on open when hasSplits is true. Null
  // while loading; empty array means "there are no splits" (either the
  // parent lied about hasSplits or they were just cleared).
  const [existingSplits, setExistingSplits] = useState<LoadedSplit[] | null>(null);
  const [splitsLoading, setSplitsLoading] = useState(false);
  const [splitSaving, setSplitSaving] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    // Lock body scroll while modal is open so a tap-then-scroll on
    // mobile doesn't move the list under the lightbox.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Fetch the doc's existing splits once when the dialog opens on a
  // split doc. Also refetch when the admin flips into split-mode from
  // an unsplit surface (they might have DELETEd + reopened) — safe
  // even when the server returns an empty list.
  useEffect(() => {
    if (!splitMode) return;
    let cancelled = false;
    setSplitsLoading(true);
    fetch(`/api/admin/documents/${doc.id}/splits`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : { splits: [] }))
      .then(d => {
        if (cancelled) return;
        const list: LoadedSplit[] = (d.splits ?? []).map((s: { project_id: string; amount: number | string }) => ({
          project_id: s.project_id,
          amount: typeof s.amount === "string" ? parseFloat(s.amount) : s.amount,
        }));
        setExistingSplits(list);
      })
      .catch(() => { if (!cancelled) setExistingSplits([]); })
      .finally(() => { if (!cancelled) setSplitsLoading(false); });
    return () => { cancelled = true; };
  }, [splitMode, doc.id]);

  async function saveSplits(splits: { project_id: string; amount: number }[]) {
    if (splitSaving) return;
    setSplitSaving(true);
    setSplitError(null);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/splits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splits }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setSplitError(`שמירת הפיצול נכשלה: ${b.error ?? res.status}`);
        return;
      }
      onChanged?.();
      onClose();
    } catch (e) {
      setSplitError(`שמירת הפיצול נכשלה: ${String(e)}`);
    } finally {
      setSplitSaving(false);
    }
  }

  async function clearSplits() {
    if (splitSaving) return;
    if (!confirm("לבטל את הפיצול? המסמך יחזור להיות ללא שיוך.")) return;
    setSplitSaving(true);
    setSplitError(null);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/splits`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setSplitError(`ביטול הפיצול נכשל: ${b.error ?? res.status}`);
        return;
      }
      onChanged?.();
      // Stay open on the single-assign surface so the admin can pick a
      // single project immediately if they want. existingSplits reset
      // so a re-flip into split-mode starts empty.
      setExistingSplits(null);
      setSplitMode(false);
    } catch (e) {
      setSplitError(`ביטול הפיצול נכשל: ${String(e)}`);
    } finally {
      setSplitSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-2 sm:p-6"
      onClick={onClose}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="תצוגה מקדימה של מסמך"
    >
      <button
        type="button"
        onClick={onClose}
        title="סגור (Esc)"
        aria-label="סגור"
        className="absolute top-3 left-3 z-[81] flex items-center justify-center rounded-full bg-white/95 w-10 h-10 text-[#2D2926] shadow hover:bg-white"
      >
        <X size={22} />
      </button>

      <div
        className="w-full max-w-5xl max-h-[95vh] flex flex-col bg-white rounded-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title strip — keeps the contractor anchored to which doc
            they're looking at without dragging in the full metadata
            form. */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-[#2D2926]/10 bg-[#F5F4F0]">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#2D2926] truncate">{displayVendor(doc)}</p>
            <p className="text-xs text-[#2D2926]/65">
              {fmtCurrency(doc.total_amount, doc.currency ?? "ILS")} · {fmtDate(doc.doc_date)}
            </p>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="פתח במלון חדש"
            className="text-xs font-semibold text-[#8D775F] hover:text-[#7a6651] inline-flex items-center gap-1 shrink-0"
          >
            <FileText size={13} /> פתח בכרטיסייה
          </a>
        </div>

        {/* Document body — bytes are fetched here for the first time;
            iframe/img start streaming only after this paints. */}
        <DocumentPreviewArea
          doc={doc}
          className="flex-1 min-h-0 overflow-auto bg-[#2D2926]/5"
        />

        {/* Footer work surface. Split-mode swaps out the single-project
            assign bar for the full multi-project editor; the "פצל"
            button flips one way, "בטל פיצול" flips the other. */}
        {projects && !splitMode && (
          <div className="border-t border-[#2D2926]/10">
            <DocumentProjectAssignBar
              docId={doc.id}
              currentProjectId={doc.project_id ?? null}
              projects={projects}
              onChanged={onChanged}
            />
            <div className="px-3 py-2 bg-[#F5F4F0] flex items-center justify-end">
              <button
                type="button"
                onClick={() => { setSplitError(null); setSplitMode(true); }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#8D775F] hover:text-[#7a6651]"
                title="פצל את הסכום בין כמה פרויקטים"
              >
                <Scissors size={12} /> פצל בין פרויקטים
              </button>
            </div>
          </div>
        )}

        {projects && splitMode && (
          <div className="border-t border-[#2D2926]/10 p-3 bg-[#F5F4F0] space-y-2">
            {splitsLoading && (
              <p className="flex items-center gap-1.5 text-xs text-[#2D2926]/65">
                <Loader2 size={11} className="animate-spin" /> טוען פיצול קיים…
              </p>
            )}
            {!splitsLoading && (
              <DocumentSplitPanel
                docTotal={doc.amount_ils ?? doc.total_amount ?? null}
                projects={projects}
                saving={splitSaving}
                onSave={saveSplits}
                onCancel={() => { setSplitError(null); setSplitMode(hasSplits); }}
                error={splitError}
                initialSplits={existingSplits ?? undefined}
              />
            )}
            {hasSplits && !splitsLoading && (
              <button
                type="button"
                onClick={clearSplits}
                disabled={splitSaving}
                className="w-full inline-flex items-center justify-center gap-1 text-xs font-semibold text-red-700 border border-red-200 bg-white px-3 py-1.5 rounded hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                <RotateCcw size={12} /> בטל פיצול
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
