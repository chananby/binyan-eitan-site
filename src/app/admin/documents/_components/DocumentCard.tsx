"use client";

// One financial document as a card (mobile-first — not a table row).
//   line 1: vendor name + bold amount
//   line 2: doc-type label · date · project
//   + a status chip (pending / approved / rejected / extraction-failed)
// The whole card links to the detail screen.

import Link from "next/link";
import { AlertTriangle, Building2 } from "lucide-react";
import {
  DOC_TYPE_LABELS, statusChip, fmtCurrency, fmtDate, displayVendor, type DocRow,
} from "./labels";

export default function DocumentCard({ doc }: { doc: DocRow }) {
  const chip = statusChip(doc);
  return (
    <Link
      href={`/admin/documents/${doc.id}`}
      className="block bg-white border border-[#2D2926]/10 rounded-md shadow-sm px-4 py-3 hover:border-[#8D775F]/50 transition-colors"
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
            {doc.project?.name && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5"><Building2 size={11} />{doc.project.name}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2">
        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${chip.className}`}>
          {chip.warn && <AlertTriangle size={11} />}
          {chip.label}
        </span>
      </div>
    </Link>
  );
}
