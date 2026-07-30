"use client";

/**
 * RateManager — per-worker rate history + "add new rate" form.
 *
 * Sits inside the worker edit row in WorkersTab. The parent passes the
 * worker (id, name, employment_type) and the component owns its own
 * fetch / form state. On a successful save it calls onRateChanged() so
 * the parent can re-render the worker list (and clear the ⚠️ flag).
 *
 * "Update rate" means INSERT a new effective_month row, not UPDATE an
 * existing column. Same month → server upserts. The history table at the
 * top of the panel shows every row, newest first.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle, Plus } from "lucide-react";
import MonthField from "./MonthField";

interface RateRow {
  id: string;
  effective_month: string; // YYYY-MM-DD
  hourly_rate: number | null;
  daily_rate: number | null;
  monthly_global_salary: number | null;
  created_by: string | null;
  created_at: string;
}

interface Props {
  staffId: string;
  employmentType: "hourly" | "daily" | "global" | string;
  onRateChanged: () => void;
}

// "YYYY-MM-DD" → "DD/MM/YYYY" for human display.
function formatMonth(ymd: string): string {
  const [y, m] = ymd.split("-");
  return `${m}/${y}`;
}

// Default effective_month for the "add" form: first of the *next* Israel
// calendar month, so the admin's typical case (rate change effective next
// month) is one click away.
function nextMonthYM(): string {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const [y, m] = today.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function currentMonthYM(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" }).slice(0, 7);
}

export default function RateManager(p: Props) {
  const [rates, setRates]   = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // Add-rate form state
  const [open, setOpen]       = useState(false);
  const [month, setMonth]     = useState(nextMonthYM());
  const [amount, setAmount]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const empLabel =
    p.employmentType === "global" ? "גלובלי (₪/חודש)"
    : p.employmentType === "daily" ? "יומי (₪)"
    : "שעתי (₪)";

  const fetchRates = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/staff/${p.staffId}/rates`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const d = await res.json();
      setRates(d.rates ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [p.staffId]);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  function rateValue(r: RateRow): number | null {
    if (p.employmentType === "global") return r.monthly_global_salary;
    if (p.employmentType === "daily")  return r.daily_rate;
    return r.hourly_rate;
  }

  // "Does this worker have a row whose rate carries the current month?" —
  // mirrors the server-side getRatesForMonth lookup for currentMonthYM():
  // the relevant row is the most recent with effective_month <= "YYYY-MM-01",
  // and "valid" means the field for this employment_type is > 0.
  // Drives the smart default below.
  function hasValidCurrentMonthRate(): boolean {
    const targetFirst = currentMonthYM() + "-01";
    // `rates` arrives newest-first from the API, so the first row with
    // effective_month <= target is the one that would apply.
    const applicable = rates.find(r => r.effective_month <= targetFirst);
    if (!applicable) return false;
    const v = rateValue(applicable);
    return (Number(v) || 0) > 0;
  }

  // Default month when opening the add-rate form:
  //  - no usable current-month rate → current month (one-click fix for ⚠️)
  //  - already has a valid rate     → next month (planned future change)
  function defaultMonthForOpen(): string {
    return hasValidCurrentMonthRate() ? nextMonthYM() : currentMonthYM();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { setFormErr("יש להזין סכום חיובי"); return; }
    if (!/^\d{4}-\d{2}$/.test(month)) { setFormErr('בחר חודש תחולה'); return; }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { effective_month: month + "-01" };
      if (p.employmentType === "global") body.monthly_global_salary = n;
      else if (p.employmentType === "daily") body.daily_rate = n;
      else                                   body.hourly_rate = n;
      const res = await fetch(`/api/admin/staff/${p.staffId}/rates`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setFormErr(d.error ?? `שגיאה ${res.status}`); return; }
      setAmount(""); setOpen(false);
      await fetchRates();
      p.onRateChanged();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 border-t border-charcoal/10 pt-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-micro font-semibold text-charcoal/70 uppercase tracking-wider">
          היסטוריית תעריפים — {empLabel}
        </p>
        {!open && (
          <button
            type="button"
            onClick={() => { setOpen(true); setMonth(defaultMonthForOpen()); setAmount(""); setFormErr(null); }}
            className="text-micro inline-flex items-center gap-1 border border-accent/40 text-accent px-2 py-1 hover:bg-accent hover:text-bone transition-colors"
          >
            <Plus size={11} strokeWidth={2} /> עדכן תעריף
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="bg-bone/60 border border-warm-gray-light p-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-caption uppercase tracking-wide text-charcoal/70">חודש תחולה</span>
              <MonthField value={month} onChange={setMonth} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption uppercase tracking-wide text-charcoal/70">סכום ({empLabel})</span>
              <input
                type="number" step="0.5" min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border border-charcoal/20 bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
                dir="ltr"
                placeholder="55"
              />
            </label>
          </div>
          {formErr && (
            <p className="flex items-center gap-1.5 text-caption text-red-600">
              <AlertCircle size={11} /> {formErr}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-accent text-bone py-1.5 text-micro font-semibold tracking-wider uppercase hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            >
              {submitting ? <><Loader2 size={11} className="animate-spin" /> שומר…</> : "שמור"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="flex-1 border border-charcoal/20 text-charcoal/70 py-1.5 text-micro font-semibold tracking-wider uppercase hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-caption text-charcoal/70">טוען…</p>}
      {error && <p className="flex items-center gap-1 text-caption text-red-600"><AlertCircle size={10}/> {error}</p>}
      {!loading && !error && rates.length === 0 && (
        <p className="text-caption text-amber-700">⚠️ אין שורות תעריף — לחץ "עדכן תעריף" כדי להוסיף.</p>
      )}
      {!loading && !error && rates.length > 0 && (
        <table className="w-full text-content">
          <thead>
            <tr className="text-charcoal/65">
              <th className="text-start font-semibold py-1">תחילה</th>
              <th className="text-end font-semibold py-1">סכום</th>
              <th className="text-end font-semibold py-1 hidden sm:table-cell">נוצר ע"י</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => {
              const v = rateValue(r);
              return (
                <tr key={r.id} className="border-t border-warm-gray-light/40">
                  <td className="py-1 tabular-nums text-charcoal/70" dir="ltr">{formatMonth(r.effective_month)}</td>
                  <td className="py-1 text-end tabular-nums font-semibold">{v != null ? `₪${v.toLocaleString("he-IL", { maximumFractionDigits: 2 })}` : "—"}</td>
                  <td className="py-1 text-end text-charcoal/70 hidden sm:table-cell">{r.created_by ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
