"use client";

/**
 * DocumentLinkPicker — search + pick a doc to link the current one to.
 *
 * The current doc becomes "evidence" (linked_document_id → picked.id);
 * the picked doc stays "primary" and remains the one counted in every
 * expense/income aggregate.
 *
 * Defaults are tuned to what the invoice ↔ payment pattern actually
 * needs: same vendor, ±30 days on doc_date. The vendor filter can be
 * broadened by unchecking the toggle. A free-text query narrows the
 * search across vendor name / doc number / description.
 *
 * The picker refuses to offer:
 *   • the source doc itself (can't link to yourself), and
 *   • docs that already have linked_document_id set (they're already
 *     evidence for someone else; linking to one would produce a
 *     zero-count chain).
 * That second guard is why we can pass the primary/evidence rule as a
 * simple "linked_document_id IS NULL" filter downstream without needing
 * cycle detection.
 */

import { useEffect, useState } from "react";
import { Loader2, Search, X, Link2 } from "lucide-react";
import type { DocRow } from "./labels";
import { DOC_TYPE_LABELS, displayVendor, fmtCurrency, fmtDate } from "./labels";

interface Props {
  sourceDoc: DocRow;
  onPick: (pickedDocId: string) => void;
  onClose: () => void;
}

function shiftYmd(ymd: string | null | undefined, days: number): string {
  const anchor = ymd ? new Date(`${ymd}T12:00:00Z`) : new Date();
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}

export default function DocumentLinkPicker({ sourceDoc, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [sameVendorOnly, setSameVendorOnly] = useState(!!sourceDoc.vendor_id);
  const [results, setResults] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true); setError(null);
      const params = new URLSearchParams();
      if (sameVendorOnly && sourceDoc.vendor_id) params.set("vendor_id", sourceDoc.vendor_id);
      params.set("date_from", shiftYmd(sourceDoc.doc_date, -30));
      params.set("date_to",   shiftYmd(sourceDoc.doc_date, +30));
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "30");
      try {
        const res = await fetch(`/api/admin/documents?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(data.error ?? `שגיאה ${res.status}`); setResults([]); return; }
        const raw = (data.documents ?? []) as DocRow[];
        // Client-side guards: never offer the source doc, never offer a
        // doc that's already evidence for someone else. Together with the
        // server's linked_document_id IS NULL aggregate filter, this keeps
        // the linking graph a shallow forest — no chains, no cycles.
        const filtered = raw.filter((d) => d.id !== sourceDoc.id && d.linked_document_id == null);
        setResults(filtered);
      } catch (e) {
        if (!cancelled) { setError(String(e)); setResults([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [sourceDoc.id, sourceDoc.vendor_id, sourceDoc.doc_date, sameVendorOnly, query]);

  async function pick(id: string) {
    if (picking) return;
    setPicking(id);
    try {
      onPick(id);
    } finally {
      setPicking(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[85] bg-black/70 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="בחירת מסמך לקישור"
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-charcoal/10 bg-[#F5F4F0]">
          <div className="flex items-center gap-2 text-charcoal">
            <Link2 size={16} className="text-accent" />
            <p className="text-sm font-bold">בחר מסמך לקישור</p>
          </div>
          <button type="button" onClick={onClose} className="text-charcoal/60 hover:text-charcoal" aria-label="סגור">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-charcoal/10 space-y-2 bg-white">
          <div className="relative">
            <Search size={13} className="absolute top-1/2 -translate-y-1/2 right-2 text-charcoal/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפש לפי ספק / מס' מסמך / תיאור"
              className="w-full pl-3 pr-7 py-1.5 text-content border border-charcoal/20 rounded focus:border-accent focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-1.5 text-caption text-muted">
            <input
              type="checkbox"
              checked={sameVendorOnly}
              onChange={(e) => setSameVendorOnly(e.target.checked)}
              disabled={!sourceDoc.vendor_id}
              className="accent-accent"
            />
            <span>אותו ספק בלבד (±30 יום)</span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="flex items-center justify-center gap-1.5 text-caption text-muted py-8">
              <Loader2 size={12} className="animate-spin" /> טוען מועמדים…
            </p>
          )}
          {error && (
            <p className="text-caption text-red-600 px-4 py-3">{error}</p>
          )}
          {!loading && !error && results.length === 0 && (
            <p className="text-content text-muted py-8 text-center">אין מועמדים תואמים. הרחב את החיפוש.</p>
          )}
          {!loading && !error && results.length > 0 && (
            <ul className="divide-y divide-charcoal/5">
              {results.map((d) => (
                <li key={d.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-charcoal truncate">{displayVendor(d)}</p>
                    <p className="text-caption text-muted mt-0.5 truncate">
                      {d.doc_type ? (DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type) : "מסמך"}
                      {" · "}
                      {fmtDate(d.doc_date)}
                      {" · "}
                      {fmtCurrency(d.total_amount, d.currency ?? "ILS")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => pick(d.id)}
                    disabled={picking !== null}
                    className="shrink-0 inline-flex items-center gap-1 border border-accent/50 text-accent bg-white px-3 py-1.5 rounded text-content font-semibold hover:bg-accent/5 disabled:opacity-40"
                  >
                    {picking === d.id ? <Loader2 size={12} className="animate-spin" /> : "בחר"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
