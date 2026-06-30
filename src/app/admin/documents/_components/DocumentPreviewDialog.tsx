"use client";

/**
 * DocumentPreviewDialog — lightweight lightbox for one financial
 * document, opened from the inbox card without navigating away from
 * the list. Mounted only while open so the /file fetch is lazy (we
 * never preload bytes for the whole inbox).
 *
 * Pairs cleanly with the per-card ProjectAssignBar from PR 4: the
 * same bar is repeated inside the dialog so the contractor can look
 * at the receipt and assign its project without bouncing in and out.
 * Closing the dialog drops the iframe/img and stops streaming the
 * file — no background download lingers.
 *
 * Closes on the X button, ESC, or a backdrop click. The inner area
 * stops propagation so clicks inside the document (incl. PDF
 * scrolling) don't dismiss it. Mirrors the fullscreen overlay
 * pattern already in DocumentPreview.tsx — same look so admins don't
 * learn a second modal.
 */

import { useEffect } from "react";
import { X, FileText } from "lucide-react";
import type { DocRow } from "./labels";
import DocumentProjectAssignBar from "./DocumentProjectAssignBar";
import DocumentPreviewArea from "./DocumentPreviewArea";
import type { ProjectOption } from "./ProjectSelect";
import { fmtCurrency, fmtDate, displayVendor } from "./labels";

interface Props {
  doc: DocRow;
  /** Same prop the inbox card accepts. Omitting it hides the inline
   *  project bar — useful for read-only consumers. */
  projects?: ProjectOption[];
  /** Callback after a successful project assignment (refreshes the
   *  inbox stats just like the row-level bar does). */
  onChanged?: () => void;
  onClose: () => void;
}

export default function DocumentPreviewDialog({ doc, projects, onChanged, onClose }: Props) {
  // Still used for the "open in new tab" link in the title strip. The
  // actual preview body's mime-type branching now lives inside
  // DocumentPreviewArea — see the body further down.
  const fileUrl = `/api/admin/documents/${doc.id}/file`;

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

        {/* Inline project assign — same bar as the card itself. */}
        {projects && (
          <DocumentProjectAssignBar
            docId={doc.id}
            currentProjectId={doc.project_id ?? null}
            projects={projects}
            onChanged={onChanged}
          />
        )}
      </div>
    </div>
  );
}
