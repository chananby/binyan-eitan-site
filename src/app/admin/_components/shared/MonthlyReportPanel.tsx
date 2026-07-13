"use client";

/**
 * MonthlyReportPanel — the "cuttable" monthly attendance report card.
 *
 * Screen use is very specific: the admin picks a month, clicks "הפק דוח",
 * and gets one visually-distinct block per worker. Each block is meant to
 * be screenshotted and sent to the worker for approval before payroll.
 * The excel download button ships the same data in a workbook whose
 * per-worker blocks match the on-screen layout so the accountant sees the
 * same shape.
 *
 * Rendering owns nothing async of its own — the parent provides the two
 * settable strings (month, data) and a fetch callback. The panel formats
 * the response into per-worker cards, one after the other, separated by
 * whitespace + a thick border so a screenshot has a clean edge.
 */

import { useState } from "react";
import { AlertCircle, BarChart2, Download, Loader2 } from "lucide-react";
import { Card } from "./Card";
import MonthField from "./MonthField";

type DayStatus =
  | "present" | "in-progress" | "no-exit" | "no-entry"
  | "vacation" | "sick" | "absent-marker" | "empty";

interface DayRow {
  date: string;
  dayName: string;
  entry: string | null;
  exit: string | null;
  hours: number | null;
  status: DayStatus;
  project: string | null;
  halfDayVacation?: boolean;
}

interface WorkerBlock {
  staff: { id: string; name: string; is_freelancer: boolean; employment_type: string | null; active?: boolean };
  days: DayRow[];
  totals: {
    workDays: number;
    workHours: number;
    vacationDays: number;
    absenceDays: number;
    noExitDays: number;
    noEntryDays: number;
  };
}

interface Data {
  month: string;
  from: string;
  to:   string;
  blocks: WorkerBlock[];
}

// Hebrew month label for the block header. Anchored at noon UTC so DST
// never pushes the month over an edge.
function heMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "long",
  }).format(new Date(`${y}-${m}-15T12:00:00Z`));
}

const STATUS_LABEL: Record<DayStatus, string> = {
  "present":       "",
  "in-progress":   "בעבודה",
  "no-exit":       "ללא יציאה",
  "no-entry":      "ללא כניסה",
  "vacation":      "חופש",
  "sick":          "מחלה",
  "absent-marker": "היעדרות",
  "empty":         "",
};

// Current month string ("YYYY-MM") in Israel time for the default picker value.
function currentMonth(): string {
  return new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" }).slice(0, 7);
}

export default function MonthlyReportPanel() {
  const [month, setMonth]     = useState<string>(currentMonth);
  const [data, setData]       = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  async function fetchReport() {
    if (!month) return;
    setLoading(true); setErr(null); setData(null);
    try {
      const res = await fetch(`/api/admin/attendance/monthly-report?month=${month}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `שגיאה ${res.status}`);
      }
      const d = await res.json() as Data;
      setData(d);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  function downloadXlsx() {
    // Native anchor click — lets the browser stream the XLSX response
    // directly without buffering into memory.
    const a = document.createElement("a");
    a.href = `/api/admin/attendance/monthly-report?month=${month}&format=xlsx`;
    a.download = `attendance-monthly-${month}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={15} strokeWidth={1.5} className="text-accent shrink-0" />
        <h2 className="font-heading text-base font-bold flex-1 text-start">דוח נוכחות חודשי</h2>
      </div>
      <p className="text-caption text-muted mb-3">
        בלוק אחד לכל עובד — לצילום ושליחה לאישור לפני שכר. כולל שכירים ועצמאיים, כל יום בחודש, וסימון חופש/מחלה כשקיים.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div>
          <label className="block text-caption text-muted mb-1 font-body">חודש</label>
          <MonthField
            value={month}
            onChange={(v) => { setMonth(v); setData(null); }}
            max={currentMonth()}
          />
        </div>
        <button
          onClick={fetchReport}
          disabled={loading || !month}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-bone text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {loading
            ? <><Loader2 size={13} className="animate-spin" /> טוען...</>
            : <><BarChart2 size={13} /> הפק דוח</>}
        </button>
        <button
          onClick={downloadXlsx}
          disabled={loading || !month}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-accent text-accent text-sm font-semibold hover:bg-accent hover:text-bone disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          <Download size={13} /> הורד אקסל
        </button>
      </div>

      {err && (
        <p className="mt-3 flex items-center gap-1.5 text-caption text-red-600">
          <AlertCircle size={12} /> {err}
        </p>
      )}

      {data && (
        <div className="mt-6 space-y-6">
          {data.blocks.length === 0 && (
            <p className="text-content text-muted text-center py-4">אין עובדים בהיקף הדוח.</p>
          )}
          {data.blocks.map((b) => (
            <WorkerBlockCard key={b.staff.id} block={b} month={data.month} />
          ))}
        </div>
      )}
    </Card>
  );
}

// Per-worker card. Border + background separate one block from the next
// so a screenshot cropped to one block reads as a self-contained slip.
function WorkerBlockCard({ block, month }: { block: WorkerBlock; month: string }) {
  const classification = block.staff.is_freelancer ? "עצמאי" : "שכיר";
  return (
    <div className="border-2 border-charcoal/30 bg-white shadow-sm">
      {/* Title bar — filled, so the screenshot's top edge is obvious */}
      <div className="bg-bone-dark border-b-2 border-charcoal/30 px-4 py-3">
        <p className="font-heading text-base font-bold text-charcoal">
          {block.staff.name}
          {block.staff.active === false && (
            <span className="ms-2 text-caption font-normal text-muted">(לא פעיל)</span>
          )}
        </p>
        <p className="text-caption text-muted mt-0.5">
          {classification} · {heMonthLabel(month)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-content border-collapse">
          <thead>
            <tr className="bg-charcoal/[0.04] text-charcoal/70">
              <th className="text-start px-3 py-2 font-semibold">תאריך</th>
              <th className="text-start px-3 py-2 font-semibold">יום</th>
              <th className="text-start px-3 py-2 font-semibold">כניסה</th>
              <th className="text-start px-3 py-2 font-semibold">יציאה</th>
              <th className="text-start px-3 py-2 font-semibold">שעות</th>
              <th className="text-start px-3 py-2 font-semibold">סטטוס</th>
              <th className="text-start px-3 py-2 font-semibold">פרויקט</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/10">
            {block.days.map((d) => (
              <DayRowView key={d.date} d={d} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals bar — filled, opposite of the title, gives the screenshot
          a clean bottom edge and highlights the numbers that matter. */}
      <div className="bg-bone-dark border-t-2 border-charcoal/30 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span className="font-semibold text-charcoal">
          סה&quot;כ ימי עבודה: <span className="tabular-nums">{block.totals.workDays}</span>
        </span>
        <span className="font-semibold text-charcoal">
          סה&quot;כ שעות: <span className="tabular-nums">{block.totals.workHours.toFixed(2)}</span>
        </span>
        {block.totals.vacationDays > 0 && (
          <span className="text-muted">חופש: {block.totals.vacationDays}</span>
        )}
        {block.totals.absenceDays > 0 && (
          <span className="text-muted">היעדרות: {block.totals.absenceDays}</span>
        )}
        {block.totals.noExitDays > 0 && (
          <span className="text-amber-700">ללא יציאה: {block.totals.noExitDays}</span>
        )}
        {block.totals.noEntryDays > 0 && (
          <span className="text-amber-700">ללא כניסה: {block.totals.noEntryDays}</span>
        )}
      </div>
    </div>
  );
}

function DayRowView({ d }: { d: DayRow }) {
  const isEmpty = d.status === "empty";
  const isAbsent = d.status === "vacation" || d.status === "sick" || d.status === "absent-marker";
  const statusText = STATUS_LABEL[d.status] + (
    d.status === "vacation" && d.halfDayVacation ? " (חצי יום)" : ""
  );

  const rowClass = isEmpty
    ? "text-charcoal/40"
    : isAbsent
      ? "text-accent italic"
      : "text-charcoal";

  return (
    <tr className={rowClass}>
      <td className="px-3 py-1.5 tabular-nums" dir="ltr">
        {d.date.split("-").reverse().join("/")}
      </td>
      <td className="px-3 py-1.5">{d.dayName}</td>
      <td className="px-3 py-1.5 tabular-nums" dir="ltr">
        {d.entry ?? (isEmpty ? "" : "—")}
      </td>
      <td className="px-3 py-1.5 tabular-nums" dir="ltr">
        {d.exit ?? (isEmpty ? "" : "—")}
      </td>
      <td className="px-3 py-1.5 tabular-nums">
        {d.hours != null ? d.hours.toFixed(2) : ""}
      </td>
      <td className="px-3 py-1.5">{statusText}</td>
      <td className="px-3 py-1.5">{d.project ?? ""}</td>
    </tr>
  );
}
