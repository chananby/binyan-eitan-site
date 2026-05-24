"use client";

import React from "react";
import {
  Calendar, Loader2, AlertCircle, CheckCircle2, Clock,
  AlertTriangle, XCircle, Plane, RefreshCw,
} from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { INPUT } from "../shared/constants";
import type { WorkerHistoryDay } from "../../../../lib/worker-history-aggregate";

interface StaffLite {
  id: string;
  name: string;
  active: boolean;
}

type Props = {
  staff: StaffLite[];
  selectedStaffId: string;
  setSelectedStaffId: (id: string) => void;
  from: string;
  setFrom: (v: string) => void;
  to:   string;
  setTo:   (v: string) => void;
  days: WorkerHistoryDay[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
};

const STATUS_STYLE: Record<
  WorkerHistoryDay["status"],
  { label: string; cls: string; icon: React.ReactNode }
> = {
  present:    { label: "נוכח",      cls: "text-green-700  bg-green-50",          icon: <CheckCircle2  size={11} strokeWidth={1.5} /> },
  vacation:   { label: "חופש",      cls: "text-charcoal/50 bg-charcoal/[0.05]", icon: <Plane         size={11} strokeWidth={1.5} /> },
  missing:    { label: "לא הגיע",   cls: "text-red-600    bg-red-50",           icon: <XCircle       size={11} strokeWidth={1.5} /> },
  "no-exit":  { label: "ללא יציאה", cls: "text-amber-700  bg-amber-50",         icon: <AlertTriangle size={11} strokeWidth={1.5} /> },
};

export default function WorkerHistoryPanel(p: Props) {
  // Active workers first; keep inactive optionally available later if needed.
  const selectableStaff = p.staff.filter(s => s.active);

  const allMissingOrEmpty = p.days.length === 0 || p.days.every(d => d.status === "missing");
  const totalHours   = p.days.reduce((s, d) => s + (d.hours ?? 0), 0);
  const presentDays  = p.days.filter(d => d.status === "present").length;
  const missingDays  = p.days.filter(d => d.status === "missing").length;
  const selectedName = selectableStaff.find(s => s.id === p.selectedStaffId)?.name;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={15} strokeWidth={1.5} className="text-accent" />
          <h2 className="font-heading text-base font-bold">היסטוריית עובד</h2>
        </div>
        {p.selectedStaffId && (
          <button
            onClick={p.onReload}
            className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent transition-colors"
          >
            <RefreshCw size={12} strokeWidth={1.5} /> רענן
          </button>
        )}
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Field label="עובד">
          <select
            value={p.selectedStaffId}
            onChange={e => p.setSelectedStaffId(e.target.value)}
            className={INPUT}
          >
            <option value="">בחר עובד...</option>
            {selectableStaff.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="מ-">
          <input
            type="date"
            value={p.from}
            onChange={e => p.setFrom(e.target.value)}
            className={INPUT}
            dir="ltr"
          />
        </Field>
        <Field label="עד">
          <input
            type="date"
            value={p.to}
            onChange={e => p.setTo(e.target.value)}
            className={INPUT}
            dir="ltr"
          />
        </Field>
      </div>

      {!p.selectedStaffId && (
        <p className="text-sm text-charcoal/40 text-center py-6">
          בחר עובד כדי לראות היסטוריה
        </p>
      )}

      {p.selectedStaffId && p.loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-charcoal/50">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-sm">טוען...</span>
        </div>
      )}

      {p.selectedStaffId && !p.loading && p.error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{p.error}</span>
        </div>
      )}

      {p.selectedStaffId && !p.loading && !p.error && allMissingOrEmpty && (
        <div className="text-center py-6">
          <p className="text-sm text-charcoal/50">אין פעילות בטווח זה</p>
          {selectedName && (
            <p className="text-[0.75rem] text-charcoal/30 mt-1" dir="ltr">
              {selectedName} · {p.from} → {p.to}
            </p>
          )}
        </div>
      )}

      {p.selectedStaffId && !p.loading && !p.error && !allMissingOrEmpty && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <SummaryTile label="ימי נוכחות"   value={String(presentDays)} accent="text-charcoal" />
            <SummaryTile label="שעות סה״כ"   value={totalHours.toFixed(1)} accent="text-accent" />
            <SummaryTile label="ימים חסרים" value={String(missingDays)}    accent={missingDays > 0 ? "text-red-500" : "text-charcoal/30"} />
          </div>

          {/* Day table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[0.8rem] border-collapse">
              <thead>
                <tr className="bg-bone text-charcoal/50 text-[0.75rem]">
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">תאריך</th>
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">יום</th>
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">התחלה</th>
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">סיום</th>
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">שעות</th>
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {p.days.map(d => {
                  const st = STATUS_STYLE[d.status];
                  return (
                    <tr key={d.date} className="hover:bg-bone/30">
                      <td className="px-2 py-1.5 border border-warm-gray-light tabular-nums text-charcoal/70" dir="ltr">{d.date}</td>
                      <td className="px-2 py-1.5 border border-warm-gray-light text-charcoal/60">{d.dayName}</td>
                      <td className="px-2 py-1.5 border border-warm-gray-light tabular-nums text-green-700" dir="ltr">{d.startTime ?? "—"}</td>
                      <td className="px-2 py-1.5 border border-warm-gray-light tabular-nums text-red-600"   dir="ltr">{d.endTime   ?? "—"}</td>
                      <td className="px-2 py-1.5 border border-warm-gray-light font-bold text-accent tabular-nums">
                        {d.hours != null ? d.hours.toFixed(2) : "—"}
                      </td>
                      <td className="px-2 py-1.5 border border-warm-gray-light">
                        <span className={`inline-flex items-center gap-1 text-[0.7rem] font-semibold px-1.5 py-0.5 ${st.cls}`}>
                          {st.icon} {st.label}
                          {d.halfDayVacation && <span className="text-[0.65rem]"> (½)</span>}
                        </span>
                        {d.hasPending && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[0.65rem] text-amber-700 ms-1.5"
                            title="בקשת תיקון פתוחה ליום זה"
                          >
                            <Clock size={9} strokeWidth={1.5} /> ממתין
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-bone border border-warm-gray-light p-2.5 text-center">
      <div className={`font-heading text-xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="text-[0.7rem] text-charcoal/50 mt-0.5">{label}</div>
    </div>
  );
}
