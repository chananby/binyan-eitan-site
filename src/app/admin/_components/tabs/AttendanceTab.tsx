"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart2, Loader2, Download, AlertCircle, Calendar, Plus,
  AlertTriangle, RefreshCw, Building2, Pencil, History, Phone, UserX,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { TabRefreshBar } from "../shared/TabRefreshBar";
import { StaleRefresh } from "../shared/StaleRefresh";
import { INPUT } from "../shared/constants";
import DistanceFlag from "../shared/DistanceFlag";
import CorrectionRequestsPanel, { type CorrectionRequest } from "../shared/CorrectionRequestsPanel";
import MonthlyReportPanel from "../shared/MonthlyReportPanel";
import WorkerHistoryPanel from "./WorkerHistoryPanel";
import type { WorkerHistoryDay } from "../../../../lib/worker-history-aggregate";
import { attendanceTimeHHMM, attendanceDayTimeShort } from "../../../../lib/attendance-time";

export type AttendanceSubTab = "live" | "history";

// ── Types ─────────────────────────────────────────────────────────────────────
// Duplicated from AdminPortal — these types describe the public prop surface
// of this component, so they live alongside it. Structural typing keeps them
// compatible with the parent's identically-shaped local interfaces.
export interface AttendanceRecord {
  id: string;
  action: string;
  timestamp_label: string;
  recorded_at: string;
  clock_at?: string | null;
  created_at?: string;
  is_manual?: boolean;
  status?: string;
  lat?: string | null;
  lng?: string | null;
  distance_from_project_m?: number | null;
  /** Origin channel of the row: 'web' (default), 'phone-call', 'manual'.
   *  Phone-call rows are surfaced with a chip so admins can see at a glance
   *  that no GPS verification backs the timestamp. */
  source?: string | null;
  /** "foreman:<name>" on rows created by a foreman via the manual-entry
   *  form; used by the pending panel to show WHO submitted the row. */
  edited_by?: string | null;
  staff: { id: string; name: string; phone: string; role?: string; attendance_exempt?: boolean } | null;
  project: { id: string; name: string } | null;
}

// Amber chip shown next to phone-call attendance rows in the live log,
// pending list, and recent log. Phone clocks have no GPS / DistanceFlag,
// so this gives admins a positive signal that the row is intentionally
// location-less rather than a misconfigured web clock.
function PhoneCallChip({ source }: { source?: string | null }) {
  if (source !== "phone-call") return null;
  return (
    <span
      title="החתמה טלפונית — ללא אימות מיקום"
      className="inline-flex items-center gap-0.5 text-caption font-semibold px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
    >
      <Phone size={9} strokeWidth={2} />
      <span className="hidden sm:inline">ללא אימות מיקום</span>
    </span>
  );
}
export interface AttReportRow  { staff_name: string; staff_phone: string; date: string; entry: string; exit: string; hours: number | null; project: string; }
export interface AttSummaryRow { name: string; phone: string; days: number; hours: number; }
export interface AttReportData { rows: AttReportRow[]; summary: AttSummaryRow[]; from: string; to: string; }

interface ProjectLite { id: string; name: string }
interface StaffLite { id: string; name: string; active: boolean }

// ── Constants (local) ─────────────────────────────────────────────────────────
const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export type ManualType = "regular" | "overtime" | "vacation" | "sick" | "other";
const MANUAL_TYPES: { key: ManualType; label: string; needsTimes: boolean }[] = [
  { key: "regular",  label: "יום עבודה רגיל", needsTimes: true  },
  { key: "overtime", label: "שעות נוספות",    needsTimes: true  },
  { key: "vacation", label: "חופש",           needsTimes: false },
  { key: "sick",     label: "מחלה",           needsTimes: false },
  { key: "other",    label: "אחר",            needsTimes: false },
];

// ── Shared edit-row slice (used by Pending, TodayLog, RecentLogs) ─────────────
interface EditAttSlice {
  id: string | null;
  action: string;
  project: string;
  timestamp: string;
  loading: boolean;
  msg: string;
  setAction:    (v: string) => void;
  setProject:   (v: string) => void;
  setTimestamp: (v: string) => void;
  setId:        (v: string | null) => void;
  onSubmit:     (e: React.FormEvent) => void | Promise<void>;
  onApprove?:   () => void | Promise<void>;
}

// Inline form that replaces a record row when it is the one being edited.
// Used in three places (PendingApprovals, TodayLog, RecentLogs); the
// "שמור ואשר" green button is shown only in PendingApprovals via the
// withApproveButton flag.
function EditAttRow({
  edit,
  projects,
  withApproveButton,
}: {
  edit: EditAttSlice;
  projects: ProjectLite[];
  withApproveButton: boolean;
}) {
  return (
    <form onSubmit={edit.onSubmit} className="py-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="פעולה">
          <select value={edit.action} onChange={e => edit.setAction(e.target.value)} className={INPUT}>
            <option value="כניסה">כניסה</option>
            <option value="יציאה">יציאה</option>
          </select>
        </Field>
        <Field label="שעה (תצוגה)">
          <input value={edit.timestamp} onChange={e => edit.setTimestamp(e.target.value)} placeholder="08:30" className={INPUT} dir="ltr" />
        </Field>
      </div>
      <Field label="אתר">
        <select value={edit.project} onChange={e => edit.setProject(e.target.value)} className={INPUT}>
          <option value="">ללא אתר</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      {edit.msg && <p className="text-content text-red-500">{edit.msg}</p>}
      {withApproveButton ? (
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={edit.onApprove} disabled={edit.loading}
            className="flex-1 bg-green-600 py-2 text-content font-semibold text-white hover:bg-green-700 disabled:opacity-40 transition-colors min-w-[100px]">
            {edit.loading ? "שומר..." : "שמור ואשר"}
          </button>
          <button type="submit" disabled={edit.loading}
            className="flex-1 bg-accent py-2 text-content font-semibold text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors min-w-[80px]">
            {edit.loading ? "..." : "שמור בלבד"}
          </button>
          <button type="button" onClick={() => edit.setId(null)} className="flex-1 border border-charcoal/20 py-2 text-content text-muted hover:border-accent transition-colors min-w-[60px]">ביטול</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="submit" disabled={edit.loading} className="flex-1 bg-accent py-2 text-content font-semibold text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors">{edit.loading ? "שומר..." : "שמור"}</button>
          <button type="button" onClick={() => edit.setId(null)} className="flex-1 border border-charcoal/20 py-2 text-content text-muted hover:border-accent transition-colors">ביטול</button>
        </div>
      )}
    </form>
  );
}

// ── 1. Report panel (date pickers + view + print) ────────────────────────────
function ReportPanel({
  attReportFrom,    setAttReportFrom,
  attReportTo,      setAttReportTo,
  attReportLoading, setAttReportLoading,
  attReportErr,     setAttReportErr,
  attReportData,    setAttReportData,
}: {
  attReportFrom: string;    setAttReportFrom: (v: string) => void;
  attReportTo:   string;    setAttReportTo:   (v: string) => void;
  attReportLoading: boolean; setAttReportLoading: (v: boolean) => void;
  attReportErr:  string | null; setAttReportErr: (v: string | null) => void;
  attReportData: AttReportData | null; setAttReportData: (v: AttReportData | null) => void;
}) {
  // Shared fetch — populates state for the in-app view; returns data for print
  const fetchAttReport = async (): Promise<AttReportData | null> => {
    setAttReportLoading(true); setAttReportErr(null);
    try {
      const res = await fetch(`/api/admin/attendance/report?from=${attReportFrom}&to=${attReportTo}`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `שגיאה ${res.status}`); }
      const data: AttReportData = await res.json();
      setAttReportData({ ...data, from: attReportFrom, to: attReportTo });
      return data;
    } catch (e) { setAttReportErr(String(e)); return null; }
    finally { setAttReportLoading(false); }
  };

  // Open a print-ready HTML report in a new tab → user can Ctrl+P → Save as PDF.
  // Note: window.open MUST be called from inside the click handler (not after
  // an awaited fetch resolves) so the browser doesn't classify it as a popup.
  const printAttReport = async () => {
    const data = await fetchAttReport();
    if (!data) return;
    const { rows, summary, from, to } = data;

    const byWorker = new Map<string, AttReportRow[]>();
    for (const r of rows) {
      if (!byWorker.has(r.staff_name)) byWorker.set(r.staff_name, []);
      byWorker.get(r.staff_name)!.push(r);
    }

    const detailHtml = [...byWorker.entries()].map(([name, wRows]) => {
      const workerSummary = summary.find(s => s.name === name);
      const rowsHtml = wRows.map(r => `
        <tr>
          <td>${r.date}</td>
          <td>${r.entry}</td>
          <td>${r.exit}</td>
          <td>${r.hours !== null ? r.hours.toFixed(2) : "—"}</td>
          <td>${r.project}</td>
        </tr>`).join("");
      return `
        <div class="worker-block">
          <div class="worker-header">
            <span class="worker-name">${name}</span>
            <span class="worker-meta">${workerSummary?.days ?? 0} ימי עבודה &nbsp;·&nbsp; סה"כ ${workerSummary?.hours.toFixed(2) ?? "0"} שעות</span>
          </div>
          <table>
            <thead><tr><th>תאריך</th><th>כניסה</th><th>יציאה</th><th>שעות</th><th>אתר עבודה</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    }).join("");

    const summaryHtml = summary.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.phone}</td>
        <td>${s.days}</td>
        <td>${s.hours.toFixed(2)}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8"/>
<title>דוח נוכחות ${from} – ${to}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; font-size: 12px; color: #2D2926; background: #fff; padding: 24px; direction: rtl; }
  h1 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
  .subtitle { font-size: 11px; color: #666; margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: bold; margin: 20px 0 8px; border-bottom: 1.5px solid #8D775F; padding-bottom: 4px; color: #8D775F; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { border: 1px solid #D1CFCA; padding: 5px 8px; text-align: right; }
  th { background: #F3F2EE; font-weight: bold; font-size: 11px; }
  td { font-size: 11px; }
  tr:nth-child(even) td { background: #FAFAF9; }
  .worker-block { margin-bottom: 20px; }
  .worker-header { display: flex; justify-content: space-between; align-items: baseline; padding: 6px 10px; background: #F3F2EE; border-right: 3px solid #8D775F; margin-bottom: 6px; }
  .worker-name { font-weight: bold; font-size: 12px; }
  .worker-meta { font-size: 10px; color: #666; }
  @media print {
    body { padding: 10px; }
    .worker-block { page-break-inside: avoid; }
    @page { margin: 1.5cm; size: A4; }
  }
</style>
</head>
<body>
<h1>דוח נוכחות</h1>
<div class="subtitle">תקופה: ${from} עד ${to}</div>

<div class="section-title">סיכום לפי עובד</div>
<table>
  <thead><tr><th>שם עובד</th><th>טלפון</th><th>ימי עבודה</th><th>סה"כ שעות</th></tr></thead>
  <tbody>${summaryHtml}</tbody>
</table>

<div class="section-title">פירוט יומי לפי עובד</div>
${detailHtml}
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  // Accordion — collapsed by default so the live log is what greets the
  // admin. Auto-collapse when a successful fetch produces results (the
  // result table below pushes content; keeping the form open too would
  // be noisy). Mirrors the workers-add-collapsed pattern. No localStorage.
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => { if (attReportData) setReportOpen(false); }, [attReportData]);

  return (
    <>
      <Card>
        <button
          type="button"
          onClick={() => setReportOpen(v => !v)}
          className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-expanded={reportOpen}
        >
          <BarChart2 size={15} strokeWidth={1.5} className="text-accent shrink-0" />
          <h2 className="font-heading text-base font-bold flex-1 text-start">דוח נוכחות</h2>
          {reportOpen
            ? <ChevronUp size={16} strokeWidth={1.5} className="text-charcoal/70" />
            : <ChevronDown size={16} strokeWidth={1.5} className="text-charcoal/70" />}
        </button>
        {reportOpen && (<>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end mt-4">
          <div>
            <label className="block text-caption text-muted mb-1 font-body">מתאריך</label>
            <input type="date" value={attReportFrom}
              onChange={e => { setAttReportFrom(e.target.value); setAttReportData(null); }}
              className="w-full border border-warm-gray-light bg-bone text-charcoal text-sm px-3 py-2 focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-caption text-muted mb-1 font-body">עד תאריך</label>
            <input type="date" value={attReportTo}
              onChange={e => { setAttReportTo(e.target.value); setAttReportData(null); }}
              className="w-full border border-warm-gray-light bg-bone text-charcoal text-sm px-3 py-2 focus:outline-none focus:border-accent" />
          </div>
          <button onClick={fetchAttReport} disabled={attReportLoading || !attReportFrom || !attReportTo}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-bone text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors whitespace-nowrap">
            {attReportLoading
              ? <><Loader2 size={13} className="animate-spin" /> טוען...</>
              : <><BarChart2 size={13} /> הצג דוח</>}
          </button>
          <button onClick={printAttReport} disabled={attReportLoading || !attReportFrom || !attReportTo}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-accent text-accent text-sm font-semibold hover:bg-accent hover:text-bone disabled:opacity-40 transition-colors whitespace-nowrap">
            <Download size={13} /> הורד PDF
          </button>
        </div>
        {attReportErr && (
          <p className="mt-2 text-content text-red-500 flex items-center gap-1.5">
            <AlertCircle size={12} /> {attReportErr}
          </p>
        )}
        </>)}
      </Card>

      {attReportData && (() => {
        const { rows, summary, from, to } = attReportData;

        const byWorker = new Map<string, AttReportRow[]>();
        for (const r of rows) {
          if (!byWorker.has(r.staff_name)) byWorker.set(r.staff_name, []);
          byWorker.get(r.staff_name)!.push(r);
        }

        const byDate = new Map<string, AttReportRow[]>();
        for (const r of rows) {
          if (!byDate.has(r.date)) byDate.set(r.date, []);
          byDate.get(r.date)!.push(r);
        }
        const sortedDates = [...byDate.keys()].sort((a, b) => {
          const s = (d: string) => d.split(".").reverse().join("-");
          return s(a).localeCompare(s(b));
        });

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-caption text-charcoal/70 font-body">
                דוח נוכחות — {from} עד {to}
              </p>
              <span className="text-caption text-accent font-semibold border border-accent/30 px-2 py-0.5">
                {rows.length} רשומות · {summary.length} עובדים
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {summary.map(s => (
                <div key={s.phone} className="bg-bone border border-warm-gray-light p-3">
                  <p className="font-heading font-bold text-sm text-charcoal truncate">{s.name}</p>
                  <p className="text-caption text-charcoal/70 mt-0.5">{s.phone}</p>
                  <div className="flex gap-3 mt-2">
                    <div>
                      <p className="text-lg font-heading font-bold text-accent leading-none">{s.days}</p>
                      <p className="text-content text-charcoal/70 leading-none mt-0.5">ימים</p>
                    </div>
                    <div className="w-px bg-warm-gray-light" />
                    <div>
                      <p className="text-lg font-heading font-bold text-charcoal leading-none">{s.hours.toFixed(1)}</p>
                      <p className="text-content text-charcoal/70 leading-none mt-0.5">שעות</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {sortedDates.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} strokeWidth={1.5} className="text-accent" />
                  <h3 className="font-heading font-bold text-sm">סיכום יומי לפי עובד</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-content border-collapse">
                    <thead>
                      <tr className="bg-bone text-muted">
                        <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light w-16">יום</th>
                        <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">תאריך</th>
                        <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">עובד</th>
                        <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">כניסה</th>
                        <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">יציאה</th>
                        <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">שעות</th>
                        <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">אתר עבודה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDates.map(date => {
                        const dayRows = byDate.get(date)!;
                        const [dd, mm, yyyy] = date.split(".");
                        const dow = DAYS_HE[new Date(`${yyyy}-${mm}-${dd}T12:00:00`).getDay()];
                        return dayRows.map((r, i) => (
                          <tr key={`${date}-${i}`}
                            className={`hover:bg-bone/40 transition-colors ${i === dayRows.length - 1 ? "border-b-2 border-warm-gray-light" : ""}`}
                            style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF9" }}>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light text-muted font-medium">
                              {i === 0 ? dow : ""}
                            </td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light text-charcoal/70">
                              {i === 0 ? date : ""}
                            </td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light font-semibold">{r.staff_name}</td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light text-green-700">{r.entry}</td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light text-red-600">{r.exit}</td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light font-bold text-accent">
                              {r.hours !== null ? r.hours.toFixed(2) : <span className="text-charcoal/25">—</span>}
                            </td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light text-charcoal/70 text-caption max-w-[160px] truncate">{r.project}</td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {[...byWorker.entries()].map(([name, wRows]) => {
              const ws = summary.find(s => s.name === name);
              return (
                <Card key={name}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-warm-gray-light">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-accent" />
                      <p className="font-heading font-bold text-sm">{name}</p>
                      <span className="text-caption text-charcoal/70">{ws?.phone}</span>
                    </div>
                    <div className="flex gap-3 text-caption text-muted">
                      <span><strong className="text-charcoal">{ws?.days ?? 0}</strong> ימים</span>
                      <span><strong className="text-charcoal">{(ws?.hours ?? 0).toFixed(2)}</strong> שעות</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-content border-collapse">
                      <thead>
                        <tr className="bg-bone text-muted">
                          <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">תאריך</th>
                          <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">כניסה</th>
                          <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">יציאה</th>
                          <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">שעות</th>
                          <th className="text-start font-semibold px-2.5 py-1.5 border border-warm-gray-light">אתר עבודה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wRows.map((r, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-bone/60"}>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light font-medium">{r.date}</td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light text-green-700">{r.entry}</td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light text-red-600">{r.exit}</td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light font-bold text-accent">
                              {r.hours !== null ? r.hours.toFixed(2) : <span className="text-charcoal/25">—</span>}
                            </td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light text-muted text-caption max-w-[180px] truncate">{r.project}</td>
                          </tr>
                        ))}
                      </tbody>
                      {wRows.length > 1 && (
                        <tfoot>
                          <tr className="bg-bone font-semibold">
                            <td colSpan={3} className="px-2.5 py-1.5 border border-warm-gray-light text-muted text-caption">סיכום</td>
                            <td className="px-2.5 py-1.5 border border-warm-gray-light text-accent font-bold">
                              {(ws?.hours ?? 0).toFixed(2)}
                            </td>
                            <td className="border border-warm-gray-light" />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </Card>
              );
            })}

            {rows.length === 0 && (
              <div className="text-center py-10 text-charcoal/70 text-sm">
                לא נמצאו רשומות נוכחות לתקופה זו
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}

// ── 2. Manual entry form ─────────────────────────────────────────────────────
function ManualEntryForm({
  manualOpen, setManualOpen,
  manualStaffId, setManualStaffId,
  manualDate, setManualDate,
  manualType, setManualType,
  manualEntryTime, setManualEntryTime,
  manualExitTime, setManualExitTime,
  manualProject, setManualProject,
  manualNotes, setManualNotes,
  manualLoading,
  manualMsg,    setManualMsg,
  manualErr,    setManualErr,
  onManualEntry,
  staff,
  projects,
}: {
  manualOpen: boolean; setManualOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  manualStaffId: string; setManualStaffId: (v: string) => void;
  manualDate: string;    setManualDate: (v: string) => void;
  manualType: ManualType; setManualType: (v: ManualType) => void;
  manualEntryTime: string; setManualEntryTime: (v: string) => void;
  manualExitTime:  string; setManualExitTime:  (v: string) => void;
  manualProject:   string; setManualProject:   (v: string) => void;
  manualNotes:     string; setManualNotes:     (v: string) => void;
  manualLoading:   boolean;
  manualMsg:       string | null; setManualMsg: (v: string | null) => void;
  manualErr:       string | null; setManualErr: (v: string | null) => void;
  onManualEntry:   (e: React.FormEvent) => void | Promise<void>;
  staff:    StaffLite[];
  projects: ProjectLite[];
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {manualMsg && !manualOpen && (
            <span className="text-content text-green-600 flex items-center gap-1">
              {manualMsg}
            </span>
          )}
        </div>
        <button
          onClick={() => { setManualOpen(v => !v); setManualErr(null); setManualMsg(null); }}
          className={`flex items-center gap-1.5 text-content font-semibold px-3 py-2 border transition-colors duration-150
            ${manualOpen
              ? "border-accent bg-accent text-bone hover:bg-accent-dark"
              : "border-accent/40 text-accent hover:bg-accent hover:text-bone"}`}>
          <Plus size={13} strokeWidth={2} />
          {manualOpen ? "ביטול" : "הוסף רשומה"}
        </button>
      </div>

      {manualOpen && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Plus size={15} strokeWidth={1.5} className="text-accent" />
            <h2 className="font-heading text-base font-bold">הוספת רשומת נוכחות</h2>
          </div>
          <form onSubmit={onManualEntry} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="עובד">
                <select value={manualStaffId} onChange={e => setManualStaffId(e.target.value)} required className={INPUT}>
                  <option value="">בחר עובד...</option>
                  {staff.filter(s => s.active).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="תאריך">
                <input type="date" value={manualDate} max={new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" })}
                  onChange={e => setManualDate(e.target.value)} required className={INPUT} />
              </Field>
            </div>

            <Field label="סוג רשומה">
              <div className="flex flex-wrap gap-2 pt-0.5">
                {MANUAL_TYPES.map(t => (
                  <label key={t.key} className={`flex items-center gap-1.5 px-3 py-1.5 border cursor-pointer text-content font-semibold transition-colors
                    ${manualType === t.key ? "border-accent bg-accent/10 text-accent" : "border-charcoal/15 text-muted hover:border-accent/40"}`}>
                    <input type="radio" name="manualType" value={t.key} checked={manualType === t.key}
                      onChange={() => setManualType(t.key)} className="sr-only" />
                    {t.label}
                  </label>
                ))}
              </div>
            </Field>

            {MANUAL_TYPES.find(t => t.key === manualType)?.needsTimes && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="שעת כניסה">
                  <input type="time" value={manualEntryTime} onChange={e => setManualEntryTime(e.target.value)}
                    required className={INPUT} dir="ltr" />
                </Field>
                <Field label="שעת יציאה (אופציונלי)">
                  <input type="time" value={manualExitTime} onChange={e => setManualExitTime(e.target.value)}
                    className={INPUT} dir="ltr" />
                </Field>
                <p className="col-span-2 text-caption text-muted -mt-1">
                  אפשר להשאיר יציאה ריקה — תיווצר רשומה פתוחה שתיסגר אחר כך.
                </p>
              </div>
            )}

            <Field label="אתר עבודה (אופציונלי)">
              <select value={manualProject} onChange={e => setManualProject(e.target.value)} className={INPUT}>
                <option value="">ללא אתר</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>

            <Field label={manualType === "other" ? "תיאור (חובה)" : "הערות (אופציונלי)"}>
              <input value={manualNotes} onChange={e => setManualNotes(e.target.value)}
                required={manualType === "other"}
                placeholder={manualType === "other" ? "פרט את סוג הרשומה..." : "הערה חופשית..."}
                className={INPUT} />
            </Field>

            {manualErr && (
              <p className="text-content text-red-500 flex items-center gap-1.5">
                <AlertCircle size={12} /> {manualErr}
              </p>
            )}

            <div className="flex gap-2">
              <button type="submit" disabled={manualLoading}
                className="flex-1 bg-accent py-2.5 text-sm font-semibold text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors">
                {manualLoading ? <><Loader2 size={13} className="inline animate-spin me-1.5" />שומר...</> : "צור רשומה"}
              </button>
              <button type="button" onClick={() => setManualOpen(false)}
                className="px-5 border border-charcoal/20 py-2.5 text-content text-muted hover:border-accent transition-colors">
                ביטול
              </button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

// ── 3. Pending approvals ─────────────────────────────────────────────────────
function PendingApprovals({
  pendingRecords, pendingLoading, pendingErr, pendingActionId,
  onLoadPending, onApproveAtt, onRejectAtt, onStartEditAtt,
  edit, projects, farThresholdM,
}: {
  pendingRecords: AttendanceRecord[];
  pendingLoading: boolean;
  pendingErr: string | null;
  pendingActionId: string | null;
  onLoadPending:  () => void | Promise<void>;
  onApproveAtt:   (id: string) => void | Promise<void>;
  onRejectAtt:    (id: string) => void | Promise<void>;
  onStartEditAtt: (r: AttendanceRecord, isPending?: boolean) => void;
  edit:           EditAttSlice;
  projects:       ProjectLite[];
  farThresholdM:  number;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} strokeWidth={1.5} className="text-amber-500" />
          <h2 className="font-heading text-base font-bold">בקשות תיקון ממתינות</h2>
          {pendingRecords.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-caption font-bold px-2 py-0.5">
              {pendingRecords.length}
            </span>
          )}
        </div>
        <button onClick={onLoadPending} className="flex items-center gap-1 text-content text-charcoal/70 hover:text-accent transition-colors">
          <RefreshCw size={12} strokeWidth={1.5} /> רענן
        </button>
      </div>
      {pendingErr && <p className="text-content text-red-500 flex items-center gap-1.5"><AlertCircle size={12} /> {pendingErr}</p>}
      {/* StaleRefresh keeps the queue visible during a post-approve reload —
          the row the admin just approved disappears, others stay put, and a
          small badge in the corner signals the in-flight fetch instead of
          blanking the whole list back to a 'טוען...' placeholder. */}
      {!pendingErr && (
      <StaleRefresh
        loading={pendingLoading}
        hasContent={pendingRecords.length > 0}
        spinner={<p className="text-sm text-charcoal/70 text-center py-4">טוען...</p>}
      >
        {pendingRecords.length === 0 && (
          <p className="text-sm text-charcoal/70 text-center py-4">אין בקשות ממתינות לאישור</p>
        )}
        {pendingRecords.length > 0 && (
        <div className="divide-y divide-charcoal/15">
          {pendingRecords.map(r => (
            <React.Fragment key={r.id}>
              {edit.id === r.id ? (
                <EditAttRow edit={edit} projects={projects} withApproveButton />
              ) : (
                <div className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{r.staff?.name ?? "—"}</p>
                        <span className={`text-caption font-semibold px-1.5 py-0.5 ${r.action === "כניסה" || r.action === "in" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                          {r.action === "in" ? "כניסה" : r.action === "out" ? "יציאה" : r.action}
                        </span>
                        {(() => {
                          // Pending entries are usually manual corrections for past
                          // days, so date + time both matter. Computed from clock_at
                          // (always reliable) rather than the legacy timestamp_label
                          // column whose format varies row by row.
                          const t = attendanceDayTimeShort(r);
                          return t ? (
                            <span className="text-caption text-charcoal/70 tabular-nums" dir="ltr">{t}</span>
                          ) : null;
                        })()}
                        <DistanceFlag r={r} threshold={farThresholdM} />
                        <PhoneCallChip source={r.source} />
                      </div>
                      {r.project && (
                        <div className="flex items-center gap-1 mt-0.5 text-caption text-charcoal/70">
                          <Building2 size={10} strokeWidth={1.5} /><span>{r.project.name}</span>
                        </div>
                      )}
                      {r.created_at && (
                        <p className="text-caption text-charcoal/70 mt-0.5">
                          הוגש: {new Date(r.created_at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          {r.edited_by?.startsWith("foreman:") && (
                            <>
                              {" · "}
                              <span className="text-charcoal">מנהל: {r.edited_by.slice("foreman:".length)}</span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <button onClick={() => onStartEditAtt(r, true)} className="text-charcoal/70 hover:text-accent transition-colors p-1">
                        <Pencil size={12} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => onApproveAtt(r.id)}
                        disabled={pendingActionId !== null}
                        className="text-caption font-semibold border border-green-200 text-green-700 hover:bg-green-600 hover:text-white px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {pendingActionId === r.id ? <Loader2 size={11} className="animate-spin" /> : "אשר"}
                      </button>
                      <button onClick={() => onRejectAtt(r.id)}
                        disabled={pendingActionId !== null}
                        className="text-caption font-semibold border border-red-200 text-red-500 hover:bg-red-500 hover:text-white px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {pendingActionId === r.id ? <Loader2 size={11} className="animate-spin" /> : "דחה"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        )}
      </StaleRefresh>
      )}
    </Card>
  );
}

// ── 3b. Absent-today panel ───────────────────────────────────────────────────
// Surfaces the names of active workers (role עובד/ממונה, attendance_exempt=false)
// who haven't clocked in yet today. The set is computed in AdminPortal so the
// dashboard attention card and this panel stay byte-identical — this component
// just renders. Hidden when the set is empty, so it's invisible after every
// expected worker has clocked.
function AbsentTodayPanel({ staff, absentTodayIds }: {
  staff: StaffLite[]; absentTodayIds: Set<string>;
}) {
  if (absentTodayIds.size === 0) return null;
  const absentList = staff
    .filter(s => absentTodayIds.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
  if (absentList.length === 0) return null;
  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <UserX size={15} strokeWidth={1.5} className="text-amber-500" />
        <h2 className="font-heading text-sm font-bold text-amber-700">
          טרם החתימו היום ({absentList.length})
        </h2>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {absentList.map(s => (
          <span key={s.id} className="text-content px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800">
            {s.name}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ── 4. Today's log ───────────────────────────────────────────────────────────
function TodayLog({
  todayLogs, dataLoading, attLoadErr,
  onReload, onStartEditAtt, onViewHistory,
  edit, projects, farThresholdM,
}: {
  todayLogs: AttendanceRecord[];
  dataLoading: boolean;
  attLoadErr: string | null;
  onReload: () => void;
  onStartEditAtt: (r: AttendanceRecord, isPending?: boolean) => void;
  onViewHistory: (staffId: string) => void;
  edit: EditAttSlice;
  projects: ProjectLite[];
  farThresholdM: number;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-heading text-base font-bold">יומן היום</h2>
          <p className="text-caption text-charcoal/70 font-body mt-0.5">מתעדכן אוטומטית כל דקה</p>
        </div>
        <button onClick={onReload} className="flex items-center gap-1.5 text-content border border-accent/30 text-accent hover:bg-accent hover:text-bone px-3 py-1.5 transition-colors duration-150">
          <RefreshCw size={12} strokeWidth={1.5} /> רענן עכשיו
        </button>
      </div>
      {dataLoading && <p className="text-sm text-charcoal/70 text-center py-4">טוען...</p>}
      {!dataLoading && attLoadErr && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded px-3 py-2.5 text-sm text-red-700 mb-3">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">שגיאה בטעינת דיווחי נוכחות</p>
            <p className="text-content text-red-500 mt-0.5">{attLoadErr}</p>
            <p className="text-content text-red-400 mt-1">בדוק <a href="/admin/health" className="underline">בדיקת מערכת</a> לאבחון המלא</p>
          </div>
        </div>
      )}
      {!dataLoading && !attLoadErr && todayLogs.length === 0 && <p className="text-sm text-charcoal/70 text-center py-4">אין דיווחים היום — לחץ &quot;רענן עכשיו&quot; אם עובדים כבר דיווחו</p>}
      {!dataLoading && todayLogs.length > 0 && (() => {
        // Regular workers first; "exempt-from-attendance" staff (managers,
        // global-salary roles) get a separate dimmed group at the bottom
        // so they don't clutter the operational view — they still appear
        // if they did clock in, just visually de-emphasized.
        const regular = todayLogs.filter(r => !r.staff?.attendance_exempt);
        const exempt  = todayLogs.filter(r =>  r.staff?.attendance_exempt);
        return (
          <>
            {regular.length > 0 && (
              <div className="divide-y divide-charcoal/15">
                {regular.map(r => (
                  <TodayLogRow key={r.id} r={r} edit={edit} projects={projects}
                    onStartEditAtt={onStartEditAtt} onViewHistory={onViewHistory}
                    farThresholdM={farThresholdM} dim={false} />
                ))}
              </div>
            )}
            {exempt.length > 0 && (
              <div className="mt-4 pt-3 border-t border-charcoal/15">
                <p className="text-content text-charcoal/70 font-semibold mb-1">פטורים מנוכחות</p>
                <div className="divide-y divide-charcoal/15">
                  {exempt.map(r => (
                    <TodayLogRow key={r.id} r={r} edit={edit} projects={projects}
                      onStartEditAtt={onStartEditAtt} onViewHistory={onViewHistory}
                      farThresholdM={farThresholdM} dim />
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </Card>
  );
}

function TodayLogRow({
  r, edit, projects, onStartEditAtt, onViewHistory, farThresholdM, dim,
}: {
  r: AttendanceRecord;
  edit: EditAttSlice;
  projects: ProjectLite[];
  onStartEditAtt: (r: AttendanceRecord, isPending?: boolean) => void;
  onViewHistory: (staffId: string) => void;
  farThresholdM: number;
  dim: boolean;
}) {
  if (edit.id === r.id) {
    return <EditAttRow edit={edit} projects={projects} withApproveButton={false} />;
  }
  return (
    <div className={`py-2.5 space-y-0.5 ${dim ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{r.staff?.name ?? "—"}</p>
          <p className="text-caption text-charcoal/35 tabular-nums" dir="ltr">{r.staff?.phone ?? ""}</p>
        </div>
        <span className={`text-content font-semibold shrink-0 ${r.action === "כניסה" || r.action === "in" ? "text-green-600" : "text-red-400"}`}>
          {r.action === "in" ? "כניסה" : r.action === "out" ? "יציאה" : r.action}
        </span>
        <span className="text-content text-charcoal/35 tabular-nums shrink-0" dir="ltr">
          {attendanceTimeHHMM(r)}
        </span>
        <DistanceFlag r={r} threshold={farThresholdM} />
        <PhoneCallChip source={r.source} />
        <button onClick={() => onStartEditAtt(r)} className="text-charcoal/70 hover:text-accent transition-colors shrink-0 p-0.5">
          <Pencil size={11} strokeWidth={1.5} />
        </button>
        {r.staff?.id && (
          <button
            onClick={() => onViewHistory(r.staff!.id)}
            title={`היסטוריית ${r.staff?.name ?? "עובד"}`}
            aria-label={`היסטוריית ${r.staff?.name ?? "עובד"}`}
            className="text-charcoal/70 hover:text-accent transition-colors shrink-0 p-0.5"
          >
            <History size={11} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {r.project && (
        <div className="flex items-center gap-1 text-caption text-charcoal/70">
          <Building2 size={10} strokeWidth={1.5} /><span>{r.project.name}</span>
        </div>
      )}
    </div>
  );
}

// ── 5. Recent logs (7 days) ──────────────────────────────────────────────────
function RecentLogs({
  recentLogs, recentLogsLoading, recentLogsErr,
  recentLogsVisible, setRecentLogsVisible,
  onLoadRecentLogs, onStartEditAtt,
  edit, projects, farThresholdM,
}: {
  recentLogs: AttendanceRecord[];
  recentLogsLoading: boolean;
  recentLogsErr: string | null;
  recentLogsVisible: boolean;
  setRecentLogsVisible: (v: boolean) => void;
  onLoadRecentLogs: () => void | Promise<void>;
  onStartEditAtt: (r: AttendanceRecord, isPending?: boolean) => void;
  edit: EditAttSlice;
  projects: ProjectLite[];
  farThresholdM: number;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={15} strokeWidth={1.5} className="text-accent" />
          <h2 className="font-heading text-base font-bold">עריכת רשומות אחרונות</h2>
          <span className="text-caption text-charcoal/70 font-body">7 ימים אחרונים</span>
        </div>
        {recentLogsVisible && (
          <button onClick={onLoadRecentLogs} className="flex items-center gap-1 text-content text-charcoal/70 hover:text-accent transition-colors">
            <RefreshCw size={12} strokeWidth={1.5} /> רענן
          </button>
        )}
      </div>
      {!recentLogsVisible ? (
        <button onClick={() => { setRecentLogsVisible(true); onLoadRecentLogs(); }}
          className="w-full py-2 text-content border border-charcoal/15 text-muted hover:border-accent hover:text-accent transition-colors">
          הצג רשומות 7 ימים אחרונים
        </button>
      ) : (
        <>
          {recentLogsLoading && <p className="text-sm text-charcoal/70 text-center py-4">טוען...</p>}
          {recentLogsErr && <p className="text-content text-red-500 flex items-center gap-1.5"><AlertCircle size={12} /> {recentLogsErr}</p>}
          {!recentLogsLoading && !recentLogsErr && recentLogs.length === 0 && (
            <p className="text-sm text-charcoal/70 text-center py-4">אין רשומות ב-7 הימים האחרונים</p>
          )}
          {!recentLogsLoading && recentLogs.length > 0 && (() => {
            const regular = recentLogs.filter(r => !r.staff?.attendance_exempt);
            const exempt  = recentLogs.filter(r =>  r.staff?.attendance_exempt);
            return (
              <>
                {regular.length > 0 && (
                  <div className="divide-y divide-charcoal/15">
                    {regular.map(r => (
                      <RecentLogRow key={r.id} r={r} edit={edit} projects={projects}
                        onStartEditAtt={onStartEditAtt} farThresholdM={farThresholdM} dim={false} />
                    ))}
                  </div>
                )}
                {exempt.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-charcoal/15">
                    <p className="text-content text-charcoal/70 font-semibold mb-1">פטורים מנוכחות</p>
                    <div className="divide-y divide-charcoal/15">
                      {exempt.map(r => (
                        <RecentLogRow key={r.id} r={r} edit={edit} projects={projects}
                          onStartEditAtt={onStartEditAtt} farThresholdM={farThresholdM} dim />
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </Card>
  );
}

function RecentLogRow({
  r, edit, projects, onStartEditAtt, farThresholdM, dim,
}: {
  r: AttendanceRecord;
  edit: EditAttSlice;
  projects: ProjectLite[];
  onStartEditAtt: (r: AttendanceRecord, isPending?: boolean) => void;
  farThresholdM: number;
  dim: boolean;
}) {
  if (edit.id === r.id) {
    return <EditAttRow edit={edit} projects={projects} withApproveButton={false} />;
  }
  return (
    <div className={`py-2.5 ${dim ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{r.staff?.name ?? "—"}</p>
            <span className={`text-caption font-semibold px-1.5 py-0.5 ${r.action === "כניסה" || r.action === "in" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {r.action === "in" ? "כניסה" : r.action === "out" ? "יציאה" : r.action}
            </span>
          </div>
          <p className="text-caption text-charcoal/35 tabular-nums" dir="ltr">{r.staff?.phone ?? ""}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {r.project && <span className="text-caption text-charcoal/70 max-w-[80px] truncate hidden sm:block">{r.project.name}</span>}
          <span className="text-content text-charcoal/35 tabular-nums" dir="ltr">
            {attendanceDayTimeShort(r) || "—"}
          </span>
          <DistanceFlag r={r} threshold={farThresholdM} />
          <PhoneCallChip source={r.source} />
          <button onClick={() => onStartEditAtt(r)} className="text-charcoal/70 hover:text-accent transition-colors p-0.5">
            <Pencil size={11} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
type Props = {
  // Report slice
  attReportFrom: string;    setAttReportFrom:    (v: string) => void;
  attReportTo:   string;    setAttReportTo:      (v: string) => void;
  attReportLoading: boolean; setAttReportLoading: (v: boolean) => void;
  attReportErr:  string | null; setAttReportErr: (v: string | null) => void;
  attReportData: AttReportData | null; setAttReportData: (v: AttReportData | null) => void;

  // Edit slice + handlers
  editAttId:        string | null;          setEditAttId:        (v: string | null) => void;
  editAttAction:    string;                 setEditAttAction:    (v: string) => void;
  editAttProject:   string;                 setEditAttProject:   (v: string) => void;
  editAttTimestamp: string;                 setEditAttTimestamp: (v: string) => void;
  editAttLoading:   boolean;
  editAttMsg:       string;
  onStartEditAtt:        (r: AttendanceRecord, isPending?: boolean) => void;
  onHandleEditAtt:       (e: React.FormEvent) => void | Promise<void>;
  onHandleEditAndApprove:() => void | Promise<void>;
  /** Jump to WorkerHistoryPanel for a specific staff member. Reuses the
   *  same handler the WorkersTab "היסטוריה" button uses (AdminPortal:
   *  viewWorkerHistory) so navigation lands in the existing
   *  AttendanceTab → היסטוריית עובד sub-tab without a new flow. */
  onViewHistory:         (staffId: string) => void;

  // Manual entry slice + handler
  manualOpen: boolean; setManualOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  manualStaffId: string; setManualStaffId: (v: string) => void;
  manualDate: string;    setManualDate: (v: string) => void;
  manualType: ManualType; setManualType: (v: ManualType) => void;
  manualEntryTime: string; setManualEntryTime: (v: string) => void;
  manualExitTime:  string; setManualExitTime:  (v: string) => void;
  manualProject:   string; setManualProject:   (v: string) => void;
  manualNotes:     string; setManualNotes:     (v: string) => void;
  manualLoading: boolean;
  manualMsg: string | null; setManualMsg: (v: string | null) => void;
  manualErr: string | null; setManualErr: (v: string | null) => void;
  onManualEntry: (e: React.FormEvent) => void | Promise<void>;

  // Pending slice + handlers
  pendingRecords:  AttendanceRecord[];
  pendingLoading:  boolean;
  pendingErr:      string | null;
  pendingActionId: string | null;
  onLoadPending:   () => void | Promise<void>;
  onApproveAtt:    (id: string) => void | Promise<void>;
  onRejectAtt:     (id: string) => void | Promise<void>;

  // Worker correction requests
  correctionRequests: CorrectionRequest[];
  correctionsLoading: boolean;
  correctionsErr:     string | null;
  onLoadCorrections:  () => void | Promise<void>;
  onResolveCorrection: (id: string, status: "approved" | "rejected") => Promise<boolean>;

  // Today + recent
  todayLogs:   AttendanceRecord[];
  dataLoading: boolean;
  attLoadErr:  string | null;
  onReload:    () => void;
  recentLogs:        AttendanceRecord[];
  recentLogsLoading: boolean;
  recentLogsErr:     string | null;
  recentLogsVisible: boolean; setRecentLogsVisible: (v: boolean) => void;
  onLoadRecentLogs:  () => void | Promise<void>;

  // Shared
  staff:    StaffLite[];
  projects: ProjectLite[];
  farThresholdM: number;
  /** Set of active staff_ids who haven't clocked in today. Drives the
   *  "missing today" panel in the live sub-tab. Already filtered for
   *  attendance_exempt by the parent. */
  absentTodayIds: Set<string>;

  // TabRefreshBar
  lastRefreshed: Date | null;
  refreshing:    boolean;
  onTabRefresh:  () => void;

  // Sub-tab + Worker-history panel
  subTab: AttendanceSubTab;
  setSubTab: (v: AttendanceSubTab) => void;
  historyStaffId: string;       setHistoryStaffId: (v: string) => void;
  historyFrom:    string;       setHistoryFrom:    (v: string) => void;
  historyTo:      string;       setHistoryTo:      (v: string) => void;
  historyDays:    WorkerHistoryDay[];
  historyLoading: boolean;
  historyError:   string | null;
  onLoadHistory:  () => void;
};

export default function AttendanceTab(p: Props) {
  // Bundle the edit-row state into one object so EditAttRow + sub-components
  // can take a single `edit` prop. Built fresh each render — cheap, no
  // closures captured beyond the parent props.
  const edit: EditAttSlice = {
    id:        p.editAttId,
    action:    p.editAttAction,
    project:   p.editAttProject,
    timestamp: p.editAttTimestamp,
    loading:   p.editAttLoading,
    msg:       p.editAttMsg,
    setAction:    p.setEditAttAction,
    setProject:   p.setEditAttProject,
    setTimestamp: p.setEditAttTimestamp,
    setId:        p.setEditAttId,
    onSubmit:     p.onHandleEditAtt,
    onApprove:    p.onHandleEditAndApprove,
  };

  // When there are pending approvals, pin the panel to the top of the tab —
  // approving is the most likely reason the admin opened this tab. Without
  // pending, the panel stays in its original position to keep the report
  // panel visible above the fold.
  const hasPending = p.pendingRecords.length > 0;

  const pendingPanel = (
    <PendingApprovals
      pendingRecords={p.pendingRecords}
      pendingLoading={p.pendingLoading}
      pendingErr={p.pendingErr}
      pendingActionId={p.pendingActionId}
      onLoadPending={p.onLoadPending}
      onApproveAtt={p.onApproveAtt}
      onRejectAtt={p.onRejectAtt}
      onStartEditAtt={p.onStartEditAtt}
      edit={edit}
      projects={p.projects}
      farThresholdM={p.farThresholdM}
    />
  );

  // Render only when there are open requests, OR when the load is still in
  // flight, so the panel doesn't clutter the tab on the common "no requests"
  // case.
  const hasCorrections = p.correctionRequests.length > 0 || p.correctionsLoading;
  const correctionsPanel = hasCorrections ? (
    <CorrectionRequestsPanel
      requests={p.correctionRequests}
      loading={p.correctionsLoading}
      error={p.correctionsErr}
      onReload={p.onLoadCorrections}
      onResolve={p.onResolveCorrection}
    />
  ) : null;

  return (
    <div className="space-y-5">
      <TabRefreshBar loading={p.refreshing || p.dataLoading} onRefresh={p.onTabRefresh} lastRefreshed={p.lastRefreshed} />

      {/* Sub-tab bar — live vs. per-worker history. The pending-approvals
          badge here mirrors the one on the main Attendance tab so it stays
          visible even while viewing history. */}
      <div className="flex border-b border-charcoal/15 -mt-1">
        <SubTabButton
          active={p.subTab === "live"}
          onClick={() => p.setSubTab("live")}
          badge={p.pendingRecords.length}
          icon={<Calendar size={13} strokeWidth={1.5} />}
        >
          נוכחות חיה
        </SubTabButton>
        <SubTabButton
          active={p.subTab === "history"}
          onClick={() => p.setSubTab("history")}
          icon={<History size={13} strokeWidth={1.5} />}
        >
          היסטוריית עובד
        </SubTabButton>
      </div>

      {p.subTab === "history" && (
        <WorkerHistoryPanel
          staff={p.staff}
          selectedStaffId={p.historyStaffId}    setSelectedStaffId={p.setHistoryStaffId}
          from={p.historyFrom}                  setFrom={p.setHistoryFrom}
          to={p.historyTo}                      setTo={p.setHistoryTo}
          days={p.historyDays}
          loading={p.historyLoading}
          error={p.historyError}
          onReload={p.onLoadHistory}
        />
      )}

      {p.subTab === "live" && (
        <>
          <p className="text-caption text-charcoal/70 text-center -mt-3">מתעדכן אוטומטית כל 2 דקות</p>

          {hasPending && pendingPanel}
          {correctionsPanel}

      <ReportPanel
        attReportFrom={p.attReportFrom}       setAttReportFrom={p.setAttReportFrom}
        attReportTo={p.attReportTo}           setAttReportTo={p.setAttReportTo}
        attReportLoading={p.attReportLoading} setAttReportLoading={p.setAttReportLoading}
        attReportErr={p.attReportErr}         setAttReportErr={p.setAttReportErr}
        attReportData={p.attReportData}       setAttReportData={p.setAttReportData}
      />

      <MonthlyReportPanel />

      <ManualEntryForm
        manualOpen={p.manualOpen}             setManualOpen={p.setManualOpen}
        manualStaffId={p.manualStaffId}       setManualStaffId={p.setManualStaffId}
        manualDate={p.manualDate}             setManualDate={p.setManualDate}
        manualType={p.manualType}             setManualType={p.setManualType}
        manualEntryTime={p.manualEntryTime}   setManualEntryTime={p.setManualEntryTime}
        manualExitTime={p.manualExitTime}     setManualExitTime={p.setManualExitTime}
        manualProject={p.manualProject}       setManualProject={p.setManualProject}
        manualNotes={p.manualNotes}           setManualNotes={p.setManualNotes}
        manualLoading={p.manualLoading}
        manualMsg={p.manualMsg}               setManualMsg={p.setManualMsg}
        manualErr={p.manualErr}               setManualErr={p.setManualErr}
        onManualEntry={p.onManualEntry}
        staff={p.staff}
        projects={p.projects}
      />

      {!hasPending && pendingPanel}

      <AbsentTodayPanel staff={p.staff} absentTodayIds={p.absentTodayIds} />

      <TodayLog
        todayLogs={p.todayLogs}
        dataLoading={p.dataLoading}
        attLoadErr={p.attLoadErr}
        onReload={p.onReload}
        onStartEditAtt={p.onStartEditAtt}
        onViewHistory={p.onViewHistory}
        edit={edit}
        projects={p.projects}
        farThresholdM={p.farThresholdM}
      />

      <RecentLogs
        recentLogs={p.recentLogs}
        recentLogsLoading={p.recentLogsLoading}
        recentLogsErr={p.recentLogsErr}
        recentLogsVisible={p.recentLogsVisible}
        setRecentLogsVisible={p.setRecentLogsVisible}
        onLoadRecentLogs={p.onLoadRecentLogs}
        onStartEditAtt={p.onStartEditAtt}
        edit={edit}
        projects={p.projects}
        farThresholdM={p.farThresholdM}
      />
        </>
      )}
    </div>
  );
}

// ── Sub-tab button (segmented) ───────────────────────────────────────────────
function SubTabButton({
  active, onClick, badge, icon, children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-2 text-content font-semibold tracking-wide border-b-2 transition-colors duration-150 ${
        active ? "border-accent text-accent" : "border-transparent text-charcoal/70 hover:text-charcoal/70"
      }`}
    >
      {icon}
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -end-0.5 bg-red-500 text-white text-caption font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}
