"use client";

import { useState } from "react";
import { DollarSign, Loader2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { INPUT } from "../shared/constants";
import MonthField from "../shared/MonthField";
import type { StaffMember, PayrollRow } from "../types";
import type { PayrollIncomplete } from "../hooks/usePayroll";
import type { IncompleteIssue } from "../../../../lib/attendance-incompleteness";

// Hebrew label per issue type, for the unified incompleteness banner.
const ISSUE_LABEL: Record<IncompleteIssue, string> = {
  no_exit:            "ללא יציאה",
  no_entry:           "ללא כניסה",
  no_project:         "ללא פרויקט",
  stuck_failure:      "כשל החתמה",
  pending_correction: "בקשת תיקון ממתינה",
  pending_manual:     "ממתין אישור",
};

// "Does this row carry a usable rate for its employment type?" Mirrors
// hasValidRate() on the server. If false, the worker will appear in the
// report with 0 in their pay column — that's what the notice warns about.
function rowHasNoRate(r: PayrollRow): boolean {
  if (r.employment_type === "hourly") return !(r.hourly_rate ?? 0);
  if (r.employment_type === "daily")  return !(r.daily_rate  ?? 0);
  if (r.employment_type === "global") return !(r.monthly_global_salary ?? 0);
  return false;
}

// Payroll tab content — pure move from AdminPortal.tsx. The parent owns
// payrollMonth / payrollStaffId / payrollRows / payrollLoading /
// payrollExporting plus the loadPayroll + exportPayroll handlers; this
// view consumes them via props.

interface Props {
  staff: StaffMember[];

  payrollMonth: string;
  setPayrollMonth: (v: string) => void;

  payrollStaffId: string;
  setPayrollStaffId: (v: string) => void;

  payrollRows: PayrollRow[];
  payrollIncomplete: PayrollIncomplete | null;
  payrollLoading: boolean;
  payrollExporting: null | "employees" | "freelancers";

  onLoadPayroll: () => void | Promise<void>;
  onExportPayroll: (type: "employees" | "freelancers") => void | Promise<void>;
  onGoToApprovals: () => void;
  onViewWorkerHistoryForDay: (staffId: string, ymd: string) => void;
}

// Issues that navigate to the worker's day (to complete/assign there) vs. the
// approval queue.
const APPROVAL_ISSUES = new Set<IncompleteIssue>(["pending_correction", "pending_manual"]);

export default function PayrollTab(p: Props) {
  const [showIncompleteDetail, setShowIncompleteDetail] = useState(false);
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={16} strokeWidth={1.5} className="text-accent" />
          <h2 className="font-heading text-base font-bold">דוח שכר חודשי</h2>
        </div>
        <p className="text-content text-charcoal/65 mb-4 leading-relaxed">
          בחר חודש ולחץ &quot;טען&quot; לראות סיכום ימי עבודה, שעות, חופשה ושכר ברוטו לכל עובד שעבד החודש (כולל עובד שהושבת אך עבד בחודש זה).
          ייצוא ל-XLSX מוכן לשליחה לרוא&quot;ח.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="חודש">
            <MonthField
              value={p.payrollMonth}
              onChange={p.setPayrollMonth}
            />
          </Field>
          <Field label="עובד (אופציונלי)">
            <select value={p.payrollStaffId} onChange={e => p.setPayrollStaffId(e.target.value)} className={INPUT}>
              <option value="">כל העובדים</option>
              {/* Include deactivated workers too — history/payroll are past-facing
                  (same rule as WorkerHistoryPanel). Active first, then inactive
                  with a "(לא פעיל)" suffix so the drilldown can reach a
                  deactivated worker who worked the selected month. */}
              {p.staff
                .filter(s => s.role === "עובד" || s.role === "ממונה")
                .slice()
                .sort((a, b) => Number(b.active) - Number(a.active))
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (לא פעיל)"}</option>
                ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button
              onClick={p.onLoadPayroll}
              disabled={p.payrollLoading}
              className="w-full bg-accent py-2.5 text-micro font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            >
              {p.payrollLoading ? <><Loader2 size={13} className="animate-spin" /> טוען…</> : "טען נתונים"}
            </button>
          </div>
        </div>

        {/* Separate export row — one button per accountant report,
            spelled out so it's obvious which one downloads which. */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => p.onExportPayroll("employees")}
            disabled={p.payrollExporting !== null || p.payrollLoading}
            className="border border-accent py-2.5 text-micro font-semibold tracking-wider uppercase text-accent hover:bg-accent/[0.08] disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            title='ייצוא XLSX של שכירים בלבד (כולל פנסיה וזכאות לחגים)'
          >
            {p.payrollExporting === "employees"
              ? <><Loader2 size={13} className="animate-spin" /> מייצא…</>
              : <>📥 דוח שכירים להנה&quot;ח</>}
          </button>
          <button
            onClick={() => p.onExportPayroll("freelancers")}
            disabled={p.payrollExporting !== null || p.payrollLoading}
            className="border border-accent py-2.5 text-micro font-semibold tracking-wider uppercase text-accent hover:bg-accent/[0.08] disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            title='ייצוא XLSX של עצמאים בלבד (ללא עמודות פנסיה/חגים)'
          >
            {p.payrollExporting === "freelancers"
              ? <><Loader2 size={13} className="animate-spin" /> מייצא…</>
              : <>📥 דוח עצמאים להנה&quot;ח</>}
          </button>
        </div>
      </Card>

      {/* Unified incompleteness gate — money-critical, but WARNS, never blocks.
          Fed by the incompleteness engine (all six issue types incl. pending).
          Each detail row deep-links to its fix. */}
      {p.payrollIncomplete && p.payrollIncomplete.summary.day_count > 0 && (() => {
        const { items, summary } = p.payrollIncomplete!;
        const breakdown = (Object.entries(summary.by_issue) as [IncompleteIssue, number][])
          .filter(([, n]) => n > 0)
          .map(([issue, n]) => `${n} ${ISSUE_LABEL[issue]}`);
        return (
          <Card>
            <div className="text-amber-900 bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2 px-3 py-2.5">
                <AlertTriangle size={15} strokeWidth={1.5} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-content leading-relaxed flex-1">
                  <span className="font-bold tabular-nums">{summary.day_count}</span> ימים לא שלמים בחודש זה — הם עלולים להשפיע על התלוש.
                  <div className="mt-0.5 text-charcoal/70">{breakdown.join(" · ")}</div>
                  <button
                    type="button"
                    onClick={() => setShowIncompleteDetail((s) => !s)}
                    className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-900 hover:text-accent"
                  >
                    {showIncompleteDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showIncompleteDetail ? "הסתר פירוט" : "פירוט וטיפול"}
                  </button>
                </div>
              </div>
              {showIncompleteDetail && (
                <ul className="border-t border-amber-200 divide-y divide-amber-100">
                  {items.map((it) => {
                    const goApproval = APPROVAL_ISSUES.has(it.issue);
                    return (
                      <li key={`${it.issue}-${it.ref_id}-${it.staff_id}-${it.date}`}>
                        <button
                          type="button"
                          onClick={() => goApproval ? p.onGoToApprovals() : p.onViewWorkerHistoryForDay(it.staff_id, it.date)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-content text-start hover:bg-amber-100/60 transition-colors"
                        >
                          <span className="font-semibold min-w-[6.5rem] truncate">{it.staff_name ?? "—"}</span>
                          <span className="tabular-nums text-charcoal/70" dir="ltr">{it.date}</span>
                          <span className="text-micro px-1.5 py-0.5 bg-amber-100 text-amber-800 font-semibold rounded">{ISSUE_LABEL[it.issue]}</span>
                          {it.project_name && <span className="text-charcoal/60 truncate">{it.project_name}</span>}
                          <span className="ms-auto text-amber-900 font-semibold">{goApproval ? "לאישור ←" : "לתיקון ←"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Missing-rate notice — only when at least one row in the *currently
          loaded* month is missing its rate. The list itself is computed
          server-side so this matches what gross_salary used. */}
      {(() => {
        const missing = p.payrollRows.filter(rowHasNoRate);
        if (missing.length === 0) return null;
        return (
          <Card>
            <div className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2.5">
              <AlertTriangle size={15} strokeWidth={1.5} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-content leading-relaxed">
                שים לב: ל-<span className="font-bold tabular-nums">{missing.length}</span> עובדים חסר תעריף לחודש זה
                — הם יופיעו בדוח עם 0. ניתן להשלים תעריף בטאב עובדים.
              </div>
            </div>
          </Card>
        );
      })()}

      {p.payrollRows.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm font-bold">{p.payrollRows.length} עובדים</h3>
            <span className="text-sm font-bold text-accent tabular-nums">
              סה&quot;כ ברוטו: ₪{p.payrollRows.reduce((s, r) => s + r.gross_salary, 0).toLocaleString("he-IL", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[720px] sm:min-w-0 text-caption">
              <thead>
                <tr className="border-b border-warm-gray-light">
                  <th className="text-start py-2 font-semibold text-charcoal/60">שם</th>
                  <th className="text-start py-2 font-semibold text-charcoal/60">סוג</th>
                  <th className="text-center py-2 font-semibold text-charcoal/60">ימים</th>
                  <th className="text-center py-2 font-semibold text-charcoal/60">שעות</th>
                  <th className="text-center py-2 font-semibold text-charcoal/60">חופשה</th>
                  <th className="text-center py-2 font-semibold text-charcoal/60">חגים</th>
                  <th className="text-center py-2 font-semibold text-charcoal/60">נסיעות</th>
                  <th className="text-start py-2 font-semibold text-charcoal/60">פנסיה</th>
                  <th className="text-end py-2 font-semibold text-charcoal/60">ברוטו</th>
                </tr>
              </thead>
              <tbody>
                {p.payrollRows.map(r => (
                  <tr key={r.staff_id} className="border-b border-charcoal/15">
                    <td className="py-2 font-semibold">
                      {r.name}
                      {r.is_freelancer && (
                        <span className="ms-2 inline-flex items-center text-caption font-semibold tracking-wide px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 align-middle">
                          עצמאי
                        </span>
                      )}
                      {r.active === false && !r.deleted_at && <span className="ms-2 text-caption font-normal text-charcoal/70">(לא פעיל)</span>}
                      {r.deleted_at && <span className="ms-2 text-caption font-normal text-charcoal/70">🗑️ (מחוק)</span>}
                    </td>
                    <td className="py-2 text-charcoal/60">
                      {r.employment_type === "hourly" ? "שעתי" : r.employment_type === "daily" ? "יומי" : "גלובלי"}
                    </td>
                    <td className="py-2 text-center tabular-nums">{r.employment_type === "global" && r.days_worked === 0 ? "—" : r.days_worked}</td>
                    <td className="py-2 text-center tabular-nums">{r.employment_type === "global" && r.hours_worked === 0 ? "—" : r.hours_worked.toFixed(1)}</td>
                    <td className="py-2 text-center tabular-nums">{r.vacation_days}</td>
                    <td className="py-2 text-center">{r.holiday_eligible ? "✓" : "—"}</td>
                    <td className="py-2 text-center">{r.travel_allowance ? "✓" : "—"}</td>
                    <td className="py-2 text-charcoal/60 truncate max-w-[120px]">{r.pension_status ?? "—"}</td>
                    <td className="py-2 text-end font-bold text-accent tabular-nums">₪{r.gross_salary.toLocaleString("he-IL", { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!p.payrollLoading && p.payrollRows.length === 0 && (
        <Card>
          <p className="text-sm text-charcoal/70 text-center py-6">לחץ &quot;טען נתונים&quot; לראות דוח לחודש שנבחר.</p>
        </Card>
      )}
    </div>
  );
}
