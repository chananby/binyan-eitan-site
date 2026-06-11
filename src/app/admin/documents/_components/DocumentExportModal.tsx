"use client";

// "Accountant package" modal: pick a month, optionally include pending docs,
// see how many approved (and how many still-pending) fall in range, then
// download the ZIP. Counts use the existing list GET (doc_date based); the
// download hits /api/admin/documents/export.

import { useEffect, useState } from "react";
import { Package, X, Loader2, AlertTriangle, Download } from "lucide-react";

function defaultMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate(); // last calendar day of month m (1-based)
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export default function DocumentExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [month, setMonth] = useState(defaultMonth());
  const [includePending, setIncludePending] = useState(false);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const { from, to } = monthRange(month);
    let cancelled = false;
    (async () => {
      setLoading(true); setApprovedCount(null); setPendingCount(null);
      try {
        const [a, p] = await Promise.all([
          fetch(`/api/admin/documents?status=approved&date_from=${from}&date_to=${to}&limit=500`, { cache: "no-store" }).then(r => r.json()),
          fetch(`/api/admin/documents?status=pending&date_from=${from}&date_to=${to}&limit=500`, { cache: "no-store" }).then(r => r.json()),
        ]);
        if (cancelled) return;
        setApprovedCount((a.documents ?? []).length);
        setPendingCount((p.documents ?? []).length);
      } catch { /* leave counts null */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, month]);

  if (!open) return null;
  const { from, to } = monthRange(month);
  const url = `/api/admin/documents/export?date_from=${from}&date_to=${to}${includePending ? "&status=all" : ""}`;
  const total = (approvedCount ?? 0) + (includePending ? (pendingCount ?? 0) : 0);
  const nothing = !loading && total === 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2926]/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-md p-5 space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-[#2D2926] flex items-center gap-2">
            <Package size={18} /> {'חבילה לרו"ח'}
          </h2>
          <button onClick={onClose} className="text-[#2D2926]/40 active:scale-90"><X size={20} /></button>
        </div>

        <label className="block text-xs text-[#2D2926]/60">חודש
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="w-full border border-[#2D2926]/15 rounded-md px-3 py-2 text-sm mt-1 focus:outline-none focus:border-[#8D775F]" />
        </label>

        <label className="flex items-center gap-2 text-sm text-[#2D2926]/80">
          <input type="checkbox" checked={includePending} onChange={e => setIncludePending(e.target.checked)} className="accent-[#8D775F]" />
          כלול גם ממתינים לאישור
        </label>

        <div className="text-sm min-h-[2.5rem]">
          {loading ? (
            <span className="text-[#2D2926]/50 flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> בודק...</span>
          ) : (
            <>
              <p className="text-[#2D2926]"><span className="font-bold">{approvedCount ?? 0}</span> מסמכים מאושרים בטווח</p>
              {pendingCount != null && pendingCount > 0 && (
                includePending
                  ? <p className="text-[#2D2926]/60 text-xs mt-1">כולל גם {pendingCount} ממתינים</p>
                  : <p className="text-amber-700 text-xs mt-1 flex items-start gap-1"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> שים לב: {pendingCount} מסמכים עדיין ממתינים לאישור ולא ייכללו</p>
              )}
            </>
          )}
        </div>

        <a
          href={nothing ? undefined : url}
          onClick={e => { if (nothing) e.preventDefault(); }}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-md text-sm font-semibold transition-colors ${nothing ? "bg-[#2D2926]/10 text-[#2D2926]/40 cursor-not-allowed" : "bg-[#8D775F] text-white hover:bg-[#7a6651]"}`}
        >
          <Download size={16} /> הורד חבילה
        </a>
      </div>
    </div>
  );
}
