"use client";

/**
 * DocumentLinkSection — the "קישור בין מסמכים" strip inside
 * DocumentReviewForm. Three UI states, driven by the shape of the
 * linkage graph rather than a mode flag:
 *
 *   • EVIDENCE  — the current doc's linked_document_id is set. Show
 *                 a chip pointing at the primary + a "הסר קישור" button.
 *                 The rollups already exclude us; clearing the link
 *                 promotes us back to primary and re-enters the count.
 *   • PRIMARY   — the current doc is linked-to by one or more others
 *                 (inboundEvidence.length > 0). Show read-only chips
 *                 for the evidence rows so the admin can see the paper
 *                 trail without accidentally editing it — unlinking is
 *                 done from the evidence side.
 *   • UNLINKED  — neither. Show the "+ קשר למסמך אחר" trigger.
 *
 * The linkage is one-directional (linked_document_id lives on the
 * evidence row and points at the primary), so mutating it always
 * happens via PATCH on the evidence side — even when the button lives
 * on the primary's screen.
 */

import { useState } from "react";
import Link from "next/link";
import { Link2, Unlink, Loader2 } from "lucide-react";
import type { DocRow } from "./labels";
import { DOC_TYPE_LABELS, displayVendor, fmtCurrency, fmtDate } from "./labels";
import DocumentLinkPicker from "./DocumentLinkPicker";

const LABEL = "text-xs text-[#2D2926]/60 mb-1 block";

interface Props {
  doc: DocRow;
  primaryDoc: DocRow | null;     // resolved by parent when doc.linked_document_id is set
  inboundEvidence: DocRow[];     // docs whose linked_document_id === doc.id
  onLinkChanged: () => void;     // refetch primary + inbound after any mutation
}

interface DocChipProps {
  doc: DocRow;
  href: string;
}

function DocChip({ doc, href }: DocChipProps) {
  const typeLabel = doc.doc_type ? (DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type) : "מסמך";
  return (
    <Link
      href={href}
      className="block border border-charcoal/15 rounded px-3 py-2 hover:border-accent hover:bg-accent/5 transition-colors"
    >
      <p className="text-content font-semibold text-charcoal truncate">{displayVendor(doc)}</p>
      <p className="text-caption text-muted mt-0.5 truncate">
        {typeLabel} · {fmtDate(doc.doc_date)} · {fmtCurrency(doc.total_amount, doc.currency ?? "ILS")}
      </p>
    </Link>
  );
}

export default function DocumentLinkSection({ doc, primaryDoc, inboundEvidence, onLinkChanged }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<null | "link" | "unlink">(null);
  const [error, setError] = useState<string | null>(null);

  async function patchLink(newValue: string | null) {
    setBusy(newValue ? "link" : "unlink");
    setError(null);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linked_document_id: newValue }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? `שגיאה ${res.status}`);
        return;
      }
      onLinkChanged();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  const isEvidence = !!doc.linked_document_id;
  const isPrimaryWithInbound = !isEvidence && inboundEvidence.length > 0;

  return (
    <div>
      <label className={LABEL}>קישור בין מסמכים</label>

      {isEvidence && (
        <div className="space-y-2">
          <p className="text-caption text-muted">מסמך זה מקושר ל־</p>
          {primaryDoc ? (
            <DocChip doc={primaryDoc} href={`/admin/documents/${primaryDoc.id}`} />
          ) : (
            <p className="text-caption text-muted italic">(המסמך המקושר לא נמצא)</p>
          )}
          <button
            type="button"
            onClick={() => patchLink(null)}
            disabled={busy !== null}
            className="w-full inline-flex items-center justify-center gap-1.5 text-content font-semibold text-red-700 border border-red-200 bg-white px-3 py-2 rounded-md hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            {busy === "unlink" ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
            הסר קישור
          </button>
        </div>
      )}

      {isPrimaryWithInbound && (
        <div className="space-y-2">
          <p className="text-caption text-muted">מסמכים המקושרים אליו ({inboundEvidence.length}):</p>
          <div className="space-y-1.5">
            {inboundEvidence.map((e) => (
              <DocChip key={e.id} doc={e} href={`/admin/documents/${e.id}`} />
            ))}
          </div>
          <p className="text-caption text-muted italic">להסרת קישור — פתח את המסמך המקושר.</p>
        </div>
      )}

      {!isEvidence && !isPrimaryWithInbound && (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 border border-accent/40 text-accent bg-white py-2 rounded-md text-content font-semibold hover:bg-accent/5"
        >
          <Link2 size={14} /> קשר למסמך אחר
        </button>
      )}

      {error && (
        <p className="text-caption text-red-600 mt-1">{error}</p>
      )}

      {pickerOpen && (
        <DocumentLinkPicker
          sourceDoc={doc}
          onPick={async (pickedId) => {
            setPickerOpen(false);
            await patchLink(pickedId);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
