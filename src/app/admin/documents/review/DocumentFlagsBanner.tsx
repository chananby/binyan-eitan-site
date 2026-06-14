"use client";

// Prominent attention banner at the top of a document under review. Renders
// nothing when the document is clean. The "ייתכן כפול" flag links to the
// suspected original (new tab, so the queue isn't lost).

import { AlertTriangle, Copy } from "lucide-react";
import { documentFlags, type DocRow } from "../_components/labels";

// onCompareDuplicate: when provided, the "ייתכן כפול" flag becomes a button
// that opens an in-place compare dialog instead of navigating away.
export default function DocumentFlagsBanner({ doc, onCompareDuplicate }: {
  doc: DocRow;
  onCompareDuplicate?: () => void;
}) {
  const flags = documentFlags(doc);
  if (flags.length === 0) return null;
  const hasError = flags.some(f => f.severity === "error");

  return (
    <div className={`rounded-md border px-3 py-2 ${hasError ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <AlertTriangle size={16} className={`shrink-0 ${hasError ? "text-red-600" : "text-amber-600"}`} />
        {flags.map(f =>
          f.key === "duplicate" && doc.possible_duplicate_of ? (
            <button
              key={f.key}
              onClick={onCompareDuplicate}
              className="inline-flex items-center gap-1 text-xs font-bold rounded px-2 py-0.5 bg-amber-100 text-amber-900 hover:bg-amber-200"
            >
              <Copy size={11} /> {f.label} — השווה
            </button>
          ) : (
            <span
              key={f.key}
              className={`text-xs font-bold rounded px-2 py-0.5 ${f.severity === "error" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}
            >
              {f.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
