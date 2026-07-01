"use client";

// Split-mode editor for the triage screen. Renders N rows of
// [ProjectSelect | ILS amount input | remove ×] plus a live totals
// summary. Kept as its own file so TriageClient stays under the 400-line
// project ceiling.
//
// Empty-state safeguard: never surfaces the empty splits list to the
// server. Save button stays disabled until at least one row is filled
// (project + positive amount). Zero-remainder isn't required — a partial
// assignment (some money left over) is a valid save; the panel just warns.
//
// The parent owns queue advance + undo — this component's onSave and
// onCancel are pure callbacks with a validated splits payload.

import { useState } from "react";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import ProjectSelect, { type ProjectOption } from "../_components/ProjectSelect";

export interface SplitDraft {
  key: string;              // stable React key across re-orders
  project_id: string;
  amount: string;           // string in-flight so keystroke edits work
}

function fmtIls(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return "₪" + Math.round(n).toLocaleString("he-IL");
}

function newKey(): string {
  // Not cryptographic — just a per-mount stable id for React keys.
  return `s_${(Math.random() + Date.now()).toString(36).slice(2, 10)}`;
}

export default function DocumentSplitPanel({
  docTotal,
  projects,
  saving,
  onSave,
  onCancel,
  error,
}: {
  /** Doc's total in ILS. Displayed as source-of-truth; null renders as "—". */
  docTotal: number | null;
  projects: ProjectOption[];
  saving: boolean;
  onSave: (splits: { project_id: string; amount: number }[]) => void;
  onCancel: () => void;
  error: string | null;
}) {
  // Start with two empty rows — that's the typical minimum for a split
  // (three rows are also common; the "+" button is one tap away).
  const [rows, setRows] = useState<SplitDraft[]>(() => [
    { key: newKey(), project_id: "", amount: "" },
    { key: newKey(), project_id: "", amount: "" },
  ]);

  function updateRow(i: number, patch: Partial<SplitDraft>) {
    setRows((prev) => prev.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { key: newKey(), project_id: "", amount: "" }]);
  }
  function removeRow(i: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, k) => k !== i)));
  }

  // Live totals. Rows without a numeric amount contribute 0.
  const parsed = rows.map((r) => ({
    project_id: r.project_id,
    amount: r.amount.trim() === "" ? 0 : Number(r.amount.replace(/,/g, "")),
  }));
  const totalAssigned = parsed.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0);
  const remainder = docTotal != null ? Math.round((docTotal - totalAssigned) * 100) / 100 : null;
  const over = remainder != null && remainder < 0;

  // Validity: every filled row must have BOTH a project AND a positive
  // numeric amount. Empty rows are treated as "not yet filled" — you can
  // save with fewer effective rows than the UI shows, as long as at least
  // one is valid.
  const validRows = parsed.filter(
    (r) => r.project_id && Number.isFinite(r.amount) && r.amount > 0,
  );
  const canSave = validRows.length >= 1 && !saving;

  function submit() {
    if (!canSave) return;
    onSave(validRows);
  }

  return (
    <div className="bg-white border border-charcoal/10 rounded-md shadow-[0_1px_3px_rgba(45,41,38,0.06),0_1px_2px_rgba(45,41,38,0.04)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted">פיצול בין פרויקטים</p>
        <p className="text-caption text-muted">
          סה&quot;כ במסמך: <span className="font-bold text-charcoal tabular-nums">{fmtIls(docTotal)}</span>
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.key} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <ProjectSelect
                value={r.project_id}
                onChange={(v) => updateRow(i, { project_id: v })}
                projects={projects}
                emptyLabel="— בחר פרויקט —"
                className="w-full text-content border border-charcoal/25 bg-white px-2 py-1.5 rounded focus:border-accent focus:outline-none"
              />
            </div>
            <div className="w-28 shrink-0">
              <input
                type="text"
                inputMode="decimal"
                value={r.amount}
                onChange={(e) => updateRow(i, { amount: e.target.value })}
                placeholder="₪"
                className="w-full text-content text-end tabular-nums border border-charcoal/25 bg-white px-2 py-1.5 rounded focus:border-accent focus:outline-none"
                aria-label="סכום בשקלים"
                dir="ltr"
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={rows.length <= 1}
              className="shrink-0 text-muted hover:text-red-600 disabled:opacity-30 transition-colors p-1"
              aria-label="הסר שורה"
              title="הסר שורה"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1 text-caption font-semibold text-accent hover:text-accent-dark"
      >
        <Plus size={13} /> הוסף שורה
      </button>

      {/* Live totals — always rendered so the admin knows exactly what
          they're saving. Colours flip red when over-allocating, amber when
          under (remainder > 0); neutral when the assignment exactly matches
          the invoice total. */}
      <div className="border-t border-charcoal/10 pt-3 space-y-1 text-content">
        <div className="flex justify-between">
          <span className="text-muted">שויך:</span>
          <span className="text-charcoal font-semibold tabular-nums">{fmtIls(totalAssigned)}</span>
        </div>
        {remainder != null && (
          <div className="flex justify-between">
            <span className={over ? "text-red-600 font-semibold" : "text-muted"}>
              {over ? "חריגה:" : "נותר:"}
            </span>
            <span className={`font-semibold tabular-nums ${
              over ? "text-red-600" : remainder > 0 ? "text-amber-700" : "text-emerald-700"
            }`}>
              {over ? fmtIls(Math.abs(remainder)) : fmtIls(remainder)}
            </span>
          </div>
        )}
        {over && (
          <p className="flex items-center gap-1.5 text-caption text-red-600 pt-1">
            <AlertCircle size={11} /> הסכומים חורגים מהחשבונית — ניתן לשמור, אך ודא שזו הכוונה.
          </p>
        )}
        {!over && remainder != null && remainder > 0 && (
          <p className="flex items-center gap-1.5 text-caption text-amber-800 pt-1">
            <AlertCircle size={11} /> נותרו ₪{Math.round(remainder).toLocaleString("he-IL")} שלא שויכו — יישמרו לא-מיוחסים.
          </p>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-caption text-red-600 font-semibold">
          <AlertCircle size={11} /> {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-accent text-bone px-3 py-2.5 rounded text-content font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> שומר…</> : "שמור פיצול"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-1.5 border border-charcoal/20 text-muted bg-white px-3 py-2.5 rounded text-content font-semibold hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
