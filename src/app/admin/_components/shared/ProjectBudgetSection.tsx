"use client";

// Per-project "תקציב מול ביצוע" block inside a project card. Shows the budget
// (or "לא הוגדר תקציב"), approved expense, remaining + a spent bar, and pending
// expense. Inline-edits projects.budget via PATCH, then asks the parent to
// refetch the budget-actual data. Pure display values come from the shared,
// unit-tested computeProjectBudget (server-computed and passed in as `data`).

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import type { BudgetActual } from "../../../../lib/budget-actual";

export type ProjectBudgetRow = BudgetActual & { project_id: string };

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return "₪" + Math.round(n).toLocaleString("he-IL");
}

export default function ProjectBudgetSection({ projectId, data, onSaved }: {
  projectId: string;
  data: ProjectBudgetRow | undefined;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function startEdit() {
    setValue(data?.budget != null ? String(data.budget) : "");
    setErr(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true); setErr(null);
    const trimmed = value.trim();
    const budget = trimmed === "" ? null : Number(trimmed.replace(/,/g, ""));
    if (budget != null && !Number.isFinite(budget)) { setErr("סכום לא תקין"); setSaving(false); return; }
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budget }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? "השמירה נכשלה"); return; }
      setEditing(false);
      onSaved();
    } catch (e) { setErr(String(e)); }
    finally { setSaving(false); }
  }

  // Spent bar color: green < 90%, amber 90–100, red over budget.
  const pct = data?.percentSpent ?? null;
  const barColor = pct == null ? "bg-charcoal/20" : pct > 100 ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : "bg-green-600";
  const barWidth = pct == null ? 0 : Math.min(pct, 100);

  return (
    <div className="bg-bone/60 border border-charcoal/10 px-2.5 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.7rem] font-semibold text-charcoal/70">תקציב מול ביצוע</span>
        {!editing && (
          <button onClick={startEdit} className="flex items-center gap-1 text-[0.7rem] text-accent hover:text-accent-dark">
            <Pencil size={11} /> {data?.budget != null ? "ערוך תקציב" : "הגדר תקציב"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            value={value} onChange={e => setValue(e.target.value)} dir="ltr" inputMode="decimal"
            placeholder="סכום תקציב (ריק = לא הוגדר)"
            className="flex-1 min-w-0 text-xs border border-charcoal/15 bg-white px-2 py-1 focus:border-accent focus:outline-none"
          />
          <button onClick={save} disabled={saving}
            className="text-[0.7rem] border border-accent bg-accent text-bone px-2 py-1 hover:bg-accent-dark disabled:opacity-40 shrink-0">
            {saving ? <Loader2 size={11} className="animate-spin" /> : "שמור"}
          </button>
          <button onClick={() => setEditing(false)} className="text-[0.7rem] border border-charcoal/15 text-charcoal/60 px-2 py-1 hover:border-accent shrink-0">ביטול</button>
        </div>
      ) : !data ? (
        <p className="text-[0.7rem] text-charcoal/50 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> טוען...</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs tabular-nums">
            <span className="text-charcoal/70">תקציב: <span className="font-bold text-charcoal">{data.hasBudget ? fmt(data.budget) : <span className="text-charcoal/45 font-normal">לא הוגדר</span>}</span></span>
            <span className="text-charcoal/70">ביצוע: <span className="font-bold text-charcoal">{fmt(data.approvedExpense)}</span></span>
          </div>

          {data.hasBudget && (
            <>
              <div className="h-2 w-full bg-charcoal/10 overflow-hidden rounded-sm">
                <div className={`h-full ${barColor}`} style={{ width: `${barWidth}%` }} />
              </div>
              <div className="flex items-center justify-between text-[0.7rem] tabular-nums">
                <span className={`font-semibold ${(data.remaining ?? 0) < 0 ? "text-red-600" : "text-green-700"}`}>
                  נשאר: {fmt(data.remaining)}
                </span>
                {pct != null && <span className="text-charcoal/60">{pct.toFixed(0)}% נוצל</span>}
              </div>
            </>
          )}

          {data.pendingExpense > 0 && (
            <p className="text-[0.7rem] text-amber-700">ממתין לאישור: {fmt(data.pendingExpense)} — לא נכלל בביצוע</p>
          )}
        </>
      )}

      {err && <p className="text-[0.7rem] text-red-500">{err}</p>}
    </div>
  );
}
