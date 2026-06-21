"use client";

// ForecastDetailDialog — per-worker breakdown of the monthly salary
// forecast. Opens from the Dashboard "📅 צפי שכר חודשי" card. Receives
// the already-computed list from the parent (AdminPortal fetches the
// /payroll/forecast endpoint once on mount), so this component is pure
// presentation: table + download trigger + close affordances.

import { useEffect, useState } from "react";
import { X, AlertTriangle, Download, Loader2 } from "lucide-react";

const EMPLOYMENT_LABELS: Record<string, string> = {
  hourly: "שעתי",
  daily:  "יומי",
  global: "גלובלי",
};

// Unit suffix on the rate cell, by type. A daily rate is "₪500 / יום",
// a global "salary" is just "₪10,000" (the unit is the month itself).
const RATE_UNIT: Record<string, string> = {
  hourly: "/ שעה",
  daily:  "/ יום",
  global: "",
};

export interface ForecastLine {
  id: string;
  name: string;
  employment_type: string;
  rate: number;
  monthly_forecast: number;
  missing_rate: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  lines: ForecastLine[];
  total: number;
  month: string; // "YYYY-MM" — drives the export filename query string
}

function fmtMoney(n: number): string {
  return "₪" + Math.round(n).toLocaleString("he-IL");
}

export default function ForecastDetailDialog(p: Props) {
  const [downloading, setDownloading] = useState(false);

  // ESC closes — registered only while the dialog is open so background
  // pages don't intercept the key. Cleanup on close + unmount.
  useEffect(() => {
    if (!p.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") p.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.open, p.onClose]);

  async function download() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/payroll/forecast/export?month=${encodeURIComponent(p.month)}`);
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert(`שגיאה בהורדה: ${b.error ?? res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-forecast-${p.month}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (!p.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-charcoal/50 flex items-center justify-center p-4"
      onClick={p.onClose}
      role="dialog"
      aria-modal="true"
      aria-label="פירוט צפי שכר חודשי"
    >
      <div
        className="bg-bone rounded-md shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal/10">
          <h2 className="font-heading text-base font-bold">צפי שכר חודשי — פירוט לעובד</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={download}
              disabled={downloading || p.lines.length === 0}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent border border-accent/40 rounded px-2.5 py-1.5 hover:bg-accent/10 disabled:opacity-40 transition-colors"
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              הורד
            </button>
            <button
              onClick={p.onClose}
              className="p-1 text-charcoal/50 hover:text-charcoal/80 transition-colors"
              aria-label="סגור"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {p.lines.length === 0 ? (
            <p className="text-sm text-charcoal/50 text-center py-8">אין עובדים פעילים לחישוב.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-charcoal/10 text-[0.7rem] font-semibold uppercase tracking-wide text-charcoal/55">
                  <th className="text-start py-2 px-1">שם</th>
                  <th className="text-center py-2 px-1">סוג</th>
                  <th className="text-end py-2 px-1">תעריף</th>
                  <th className="text-end py-2 px-1">צפי חודשי</th>
                </tr>
              </thead>
              <tbody>
                {p.lines.map((l) => (
                  <tr key={l.id} className="border-b border-charcoal/5">
                    <td className="py-2 px-1">
                      <div className="flex items-center gap-1.5">
                        {l.missing_rate && (
                          <AlertTriangle size={12} className="text-amber-500 shrink-0" aria-label="חסר תעריף" />
                        )}
                        <span className={l.missing_rate ? "text-charcoal/50" : "text-charcoal"}>{l.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-2 px-1 text-charcoal/65 text-xs">
                      {EMPLOYMENT_LABELS[l.employment_type] ?? l.employment_type}
                    </td>
                    <td className="text-end py-2 px-1 tabular-nums">
                      {l.rate > 0
                        ? <>{fmtMoney(l.rate)}<span className="text-charcoal/40 text-xs"> {RATE_UNIT[l.employment_type] ?? ""}</span></>
                        : <span className="text-charcoal/35">—</span>}
                    </td>
                    <td className="text-end py-2 px-1 font-semibold tabular-nums">
                      {l.monthly_forecast > 0 ? fmtMoney(l.monthly_forecast) : <span className="text-charcoal/35">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-charcoal/20">
                  <td colSpan={3} className="py-2 px-1 font-bold text-end">סה&quot;כ</td>
                  <td className="py-2 px-1 text-end font-bold text-accent tabular-nums">{fmtMoney(p.total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer note */}
        <div className="px-4 py-2.5 border-t border-charcoal/10 text-[0.7rem] text-charcoal/55 leading-snug">
          אומדן גס: 22 ימי עבודה × 8.5 שעות. לא כולל חופשות, חגים או היעדרויות.
        </div>
      </div>
    </div>
  );
}
