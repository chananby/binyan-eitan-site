"use client";

// One financial document as a card (mobile-first — not a table row).
//   line 1: vendor name + bold amount
//   line 2: doc-type label · date · project
//   + a status chip (pending / approved / rejected / extraction-failed)
//   + an "👁 תצוגה מקדימה" button (lazy lightbox of the file itself)
//   + an inline project-assign bar (PR 4 of the unification work)
//
// The link to the detail screen wraps only the upper content area —
// the project bar and the preview-dialog mount are siblings so the
// inline <select> and the preview button can't bubble a click into
// the navigation.

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Building2, Camera, Eye, RefreshCw, Loader2, Scissors } from "lucide-react";
import {
  DOC_TYPE_LABELS, statusChip, fmtCurrency, fmtDate, displayVendor, type DocRow,
} from "./labels";
import DuplicateChip from "./DuplicateChip";
import DocumentProjectAssignBar from "./DocumentProjectAssignBar";
import DocumentPreviewDialog from "./DocumentPreviewDialog";
import type { ProjectOption } from "./ProjectSelect";

export default function DocumentCard({
  doc,
  projects,
  onChanged,
  hasSplits = false,
}: {
  doc: DocRow;
  projects?: ProjectOption[];
  onChanged?: () => void;
  /** Parent-computed flag. True when this document has one or more LIVE
   *  rows in document_project_splits. Suppresses the single-project chip
   *  (project_id is NULL when a doc is split) and swaps in the "מפוצל"
   *  indicator so admins see instantly that clicking through will open a
   *  split editor rather than a single-project picker. */
  hasSplits?: boolean;
}) {
  const chip = statusChip(doc);
  // Field upload (foreman drop-box) → small camera chip with the foreman name.
  const fieldUpload = doc.uploaded_by?.startsWith("foreman:")
    ? doc.uploaded_by.slice("foreman:".length)
    : null;

  // Lightbox state — mounted only while open so the /file fetch is
  // lazy and a list of 90+ cards doesn't preload anything.
  const [previewOpen, setPreviewOpen] = useState(false);

  // Manual recovery for a row whose decoupled extraction never fired or
  // crashed mid-way (the indigo "ממתין לחילוץ" chip). Resume-on-load and the
  // 10-minute cron should usually rescue these on their own; this button is
  // the explicit, no-wait option. The extract endpoint is idempotent — a
  // second click while one is in-flight just overlays the same row.
  const [retrying, setRetrying] = useState(false);
  const isStuckOnExtraction =
    doc.extraction_status === "pending" &&
    doc.status !== "approved" &&
    doc.status !== "rejected";
  async function retryExtract(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (retrying) return;
    setRetrying(true);
    try {
      await fetch(`/api/admin/documents/${doc.id}/extract`, { method: "POST" });
    } catch { /* swallowed — the chip will reflect the next list refresh */ }
    finally {
      setRetrying(false);
      onChanged?.();
    }
  }

  // The project-assign bar is opt-in: callers that don't pass `projects`
  // (e.g. read-only contexts) get the plain card just like before.
  const showProjectBar = !!projects;

  return (
    <div className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm hover:border-[#8D775F]/50 transition-colors overflow-hidden">
      <Link
        href={`/admin/documents/${doc.id}`}
        className="block px-4 py-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#2D2926] truncate">{displayVendor(doc)}</p>
              <span className="shrink-0 font-mono font-bold text-[#2D2926]">
                {fmtCurrency(doc.total_amount, doc.currency ?? "ILS")}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-[#2D2926]/60">
              <span>{DOC_TYPE_LABELS[doc.doc_type ?? ""] ?? "—"}</span>
              <span>·</span>
              <span className="tabular-nums">{fmtDate(doc.doc_date)}</span>
              {hasSplits ? (
                <>
                  <span>·</span>
                  <span
                    className="inline-flex items-center gap-0.5 text-accent-dark font-semibold"
                    title="מסמך זה מפוצל בין כמה פרויקטים"
                  >
                    <Scissors size={11} /> מפוצל
                  </span>
                </>
              ) : doc.project?.name && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5"><Building2 size={11} />{doc.project.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${chip.className}`}>
            {chip.warn && <AlertTriangle size={11} />}
            {chip.label}
          </span>
          {isStuckOnExtraction && (
            <button
              type="button"
              onClick={retryExtract}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={retrying}
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 disabled:opacity-50 transition-colors"
              title="הפעל מחדש את חילוץ ה-AI עבור המסמך"
              aria-label="המשך עיבוד"
            >
              {retrying
                ? <Loader2 size={11} className="animate-spin" />
                : <RefreshCw size={11} />}
              המשך עיבוד
            </button>
          )}
          {fieldUpload && (
            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-[#8D775F]/10 text-[#8D775F]">
              <Camera size={11} />{fieldUpload}
            </span>
          )}
          {/* Inline preview trigger — stops propagation so clicking the
              eye doesn't follow the Link to the detail screen. The
              dialog is rendered as a sibling below so position:fixed
              works correctly regardless of any ancestor transforms. */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewOpen(true); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-[#2D2926]/[0.06] text-[#2D2926]/80 hover:bg-[#2D2926]/[0.12] transition-colors"
            title="תצוגה מקדימה"
            aria-label="תצוגה מקדימה של המסמך"
          >
            <Eye size={11} /> תצוגה
          </button>
          {/* Actionable everywhere: opens the compare dialog (vs the suspected
              original) with delete / clear-flag actions. onChanged refreshes the
              inbox list after a resolution. */}
          <DuplicateChip doc={doc} onDeleted={onChanged} onCleared={onChanged} />
        </div>
      </Link>

      {showProjectBar && (
        <DocumentProjectAssignBar
          docId={doc.id}
          currentProjectId={doc.project_id ?? null}
          projects={projects!}
          onChanged={onChanged}
        />
      )}

      {previewOpen && (
        <DocumentPreviewDialog
          doc={doc}
          projects={projects}
          onChanged={onChanged}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
