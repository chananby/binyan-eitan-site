"use client";

// Compact metadata card shown alongside the preview in TriageClient:
// vendor / amount / date / category / direction / description. Pure read,
// no inputs — kept separate so the parent's side panel stays focused on
// state + actions.

import {
  CATEGORY_LABELS, DIRECTION_LABELS, displayVendor, fmtCurrency, fmtDate,
  type DocRow,
} from "../_components/labels";

export default function DocSummaryCard({ doc }: { doc: DocRow }) {
  return (
    <div className="bg-white border border-charcoal/10 rounded-md shadow-[0_1px_3px_rgba(45,41,38,0.06),0_1px_2px_rgba(45,41,38,0.04)] p-4 space-y-2">
      <p className="text-caption text-muted">פרטי המסמך</p>
      <dl className="text-content space-y-1.5">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">ספק:</dt>
          <dd className="text-charcoal font-semibold truncate text-end">{displayVendor(doc)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">סכום:</dt>
          <dd className="text-charcoal font-bold tabular-nums text-end">{fmtCurrency(doc.total_amount, doc.currency ?? "ILS")}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">תאריך:</dt>
          <dd className="text-charcoal tabular-nums text-end">{fmtDate(doc.doc_date)}</dd>
        </div>
        {doc.category && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted">קטגוריה:</dt>
            <dd className="text-charcoal text-end">{CATEGORY_LABELS[doc.category] ?? doc.category}</dd>
          </div>
        )}
        {doc.direction && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted">כיוון:</dt>
            <dd className="text-charcoal text-end">{DIRECTION_LABELS[doc.direction] ?? doc.direction}</dd>
          </div>
        )}
      </dl>
      {doc.description && (
        <p className="text-caption text-charcoal/70 leading-snug border-t border-charcoal/10 pt-2 mt-2">
          {doc.description}
        </p>
      )}
    </div>
  );
}
