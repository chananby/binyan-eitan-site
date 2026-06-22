"use client";

import React, { useState } from "react";
import {
  Calendar, Loader2, AlertCircle, CheckCircle2, Clock,
  AlertTriangle, XCircle, Plane, RefreshCw, Pencil, Trash2, Plus,
} from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { INPUT } from "../shared/constants";
import AttendanceRowEditor, { type EditorMode } from "../shared/AttendanceRowEditor";
import type { WorkerHistoryDay } from "../../../../lib/worker-history-aggregate";

// Both edits and deletes go through the server's retro window (current /
// previous Israel-calendar month). Compute here in the client purely to
// disable buttons before submit — the server enforces independently, so
// any tampering is rejected with the same Hebrew 403 message.
function isInRetroWindow(ymd: string): boolean {
  const todayYM = new Date()
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" })
    .slice(0, 7);
  const [y, m] = todayYM.split("-").map(Number);
  const prevYM = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const dayYM = ymd.slice(0, 7);
  return dayYM === todayYM || dayYM === prevYM;
}

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
  present:      { label: "נוכח",      cls: "text-green-700  bg-green-50",          icon: <CheckCircle2  size={11} strokeWidth={1.5} /> },
  vacation:     { label: "חופש",      cls: "text-charcoal/65 bg-charcoal/[0.05]", icon: <Plane         size={11} strokeWidth={1.5} /> },
  missing:      { label: "לא הגיע",   cls: "text-red-600    bg-red-50",           icon: <XCircle       size={11} strokeWidth={1.5} /> },
  // in-progress = the worker is *currently* on the clock. Soft green dot
  // distinguishes from "present" (full day, finished) without screaming.
  "in-progress":{ label: "בעבודה",   cls: "text-green-700  bg-green-50",          icon: <span className="inline-block w-2 h-2 rounded-full bg-green-600" aria-hidden /> },
  "no-exit":    { label: "ללא יציאה", cls: "text-amber-700  bg-amber-50",         icon: <AlertTriangle size={11} strokeWidth={1.5} /> },
};

export default function WorkerHistoryPanel(p: Props) {
  // Active workers first; keep inactive optionally available later if needed.
  const selectableStaff = p.staff.filter(s => s.active);

  // Which row (by date) is currently in inline-edit mode, and in which flow.
  // Only one row open at a time — keeps the table predictable on small screens.
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editorMode,  setEditorMode]  = useState<EditorMode>("edit");
  const [deletingDate, setDeletingDate] = useState<string | null>(null); // spinner state

  const allMissingOrEmpty = p.days.length === 0 || p.days.every(d => d.status === "missing");
  const totalHours   = p.days.reduce((s, d) => s + (d.hours ?? 0), 0);
  const presentDays  = p.days.filter(d => d.status === "present").length;
  const missingDays  = p.days.filter(d => d.status === "missing").length;
  const selectedName = selectableStaff.find(s => s.id === p.selectedStaffId)?.name;

  function openEditor(date: string, mode: EditorMode) {
    setEditingDate(date);
    setEditorMode(mode);
  }

  function closeEditor() {
    setEditingDate(null);
  }

  async function deleteDay(d: WorkerHistoryDay) {
    if (!d.entryId && !d.exitId) return;
    const ok = window.confirm(
      `למחוק את רשומות הנוכחות של ${d.date}?\n` +
      `הפעולה הפיכה דרך הצוות הטכני, אך הרשומות יוסתרו מכל הדוחות.`
    );
    if (!ok) return;

    setDeletingDate(d.date);
    try {
      const ids = [d.entryId, d.exitId].filter(Boolean) as string[];
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/admin/attendance/${id}`, { method: "DELETE" }))
      );
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const b = await failed.json().catch(() => ({}));
        alert(`שגיאה במחיקה: ${b.error ?? failed.status}`);
        return;
      }
      p.onReload();
    } finally {
      setDeletingDate(null);
    }
  }

  async function handleEditorSuccess() {
    closeEditor();
    p.onReload();
  }

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
            className="flex items-center gap-1 text-xs text-charcoal/70 hover:text-accent transition-colors"
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
        <p className="text-sm text-charcoal/70 text-center py-6">
          בחר עובד כדי לראות היסטוריה
        </p>
      )}

      {p.selectedStaffId && p.loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-charcoal/65">
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
          <p className="text-sm text-charcoal/65">אין פעילות בטווח זה</p>
          {selectedName && (
            <p className="text-[0.75rem] text-charcoal/70 mt-1" dir="ltr">
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
            <SummaryTile label="ימים חסרים" value={String(missingDays)}    accent={missingDays > 0 ? "text-red-500" : "text-charcoal/70"} />
          </div>

          {/* Day table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[0.8rem] border-collapse">
              <thead>
                <tr className="bg-bone text-charcoal/65 text-[0.75rem]">
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">תאריך</th>
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">יום</th>
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">התחלה</th>
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">סיום</th>
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">שעות</th>
                  <th className="text-start font-semibold px-2 py-2 border border-warm-gray-light">סטטוס</th>
                  <th className="text-end font-semibold px-2 py-2 border border-warm-gray-light w-[1%] whitespace-nowrap">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {p.days.map(d => {
                  const st = STATUS_STYLE[d.status];
                  const editable = isInRetroWindow(d.date);
                  const outOfWindowTitle = "ניתן לערוך רק רשומות מהחודש הנוכחי או הקודם";
                  const isDeleting = deletingDate === d.date;
                  const isEditingThis = editingDate === d.date;

                  return (
                    <React.Fragment key={d.date}>
                      <tr className="hover:bg-bone/30">
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
                        <td className="px-2 py-1.5 border border-warm-gray-light text-end whitespace-nowrap">
                          <DayActions
                            day={d}
                            editable={editable}
                            disabledTitle={outOfWindowTitle}
                            isDeleting={isDeleting}
                            onEdit={() => openEditor(d.date, "edit")}
                            onComplete={() => openEditor(d.date, "complete")}
                            onAdd={() => openEditor(d.date, "add")}
                            onDelete={() => deleteDay(d)}
                          />
                        </td>
                      </tr>
                      {isEditingThis && p.selectedStaffId && (
                        <AttendanceRowEditor
                          mode={editorMode}
                          day={d}
                          staffId={p.selectedStaffId}
                          colSpan={7}
                          onCancel={closeEditor}
                          onSuccess={handleEditorSuccess}
                        />
                      )}
                    </React.Fragment>
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
      <div className="text-[0.7rem] text-charcoal/65 mt-0.5">{label}</div>
    </div>
  );
}

// Action buttons for a single day row. The status drives which actions are
// offered; the retro window drives whether they're enabled. Vacation rows
// get nothing — those are managed from the separate vacation panel.
function DayActions(props: {
  day: WorkerHistoryDay;
  editable: boolean;
  disabledTitle: string;
  isDeleting: boolean;
  onEdit:     () => void;
  onComplete: () => void;
  onAdd:      () => void;
  onDelete:   () => void;
}) {
  const { day, editable, disabledTitle, isDeleting } = props;

  if (day.status === "vacation") {
    return <span className="text-[0.65rem] text-charcoal/70">—</span>;
  }

  const disabledProps = editable
    ? {}
    : { disabled: true, title: disabledTitle };
  const btn = "inline-flex items-center gap-1 text-[0.7rem] font-semibold border px-2 py-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="inline-flex items-center gap-1.5">
      {day.status === "present" && (
        <>
          <button
            type="button"
            onClick={props.onEdit}
            className={`${btn} border-charcoal/15 text-charcoal/70 hover:border-accent hover:text-accent`}
            {...disabledProps}
          >
            <Pencil size={11} strokeWidth={1.5} /> ערוך
          </button>
        </>
      )}
      {day.status === "no-exit" && (
        <button
          type="button"
          onClick={props.onComplete}
          className={`${btn} border-amber-300 text-amber-700 hover:bg-amber-50`}
          {...disabledProps}
        >
          <Plus size={11} strokeWidth={1.5} /> השלם יציאה
        </button>
      )}
      {day.status === "missing" && (
        <button
          type="button"
          onClick={props.onAdd}
          className={`${btn} border-green-300 text-green-700 hover:bg-green-50`}
          {...disabledProps}
        >
          <Plus size={11} strokeWidth={1.5} /> הוסף יום
        </button>
      )}
      {(day.entryId || day.exitId) && (
        <button
          type="button"
          onClick={props.onDelete}
          className={`${btn} border-red-200 text-red-500 hover:bg-red-50`}
          {...disabledProps}
        >
          {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} strokeWidth={1.5} />}
        </button>
      )}
    </div>
  );
}
