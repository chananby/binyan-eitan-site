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

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, AlertTriangle, BarChart2, Loader2, Printer, User, Users } from "lucide-react";
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
  pendingCount?: number;
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

interface StaffLite { id: string; name: string; active: boolean }

export default function MonthlyReportPanel({ staff }: { staff: StaffLite[] }) {
  const [month, setMonth]     = useState<string>(currentMonth);
  // Worker scope: "" = all workers (default). Picking a worker narrows BOTH the
  // on-screen report ("הפק דוח") and the XLSX export to that one worker — the
  // endpoint already takes staff_id, so it's just an extra query param.
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [data, setData]       = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  // Which worker block is currently being printed (a copy is portaled to
  // <body> as `.report-print-root` and the print stylesheet shows only it).
  const [printingId, setPrintingId] = useState<string | null>(null);
  // Generation date stamped on the printed slip + PDF title. DD.MM.YYYY with
  // DOTS — never "/" or "#", which browsers mangle in the Save-as-PDF filename
  // (the lesson from the quote generator). Computed once per mount.
  const [genDate] = useState(() =>
    new Date().toLocaleDateString("en-GB", {
      timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric",
    }).replace(/\//g, "."),
  );

  async function fetchReport() {
    if (!month) return;
    setLoading(true); setErr(null); setData(null);
    try {
      const staffParam = selectedStaffId ? `&staff_id=${selectedStaffId}` : "";
      const res = await fetch(`/api/admin/attendance/monthly-report?month=${month}${staffParam}`);
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
    // directly without buffering into memory. Scoped by the export selector:
    // a worker → that worker only; "" → all. The server builds the filename
    // (Content-Disposition), so the download attr here is just a fallback.
    const a = document.createElement("a");
    const staffParam = selectedStaffId ? `&staff_id=${selectedStaffId}` : "";
    a.href = `/api/admin/attendance/monthly-report?month=${month}${staffParam}&format=xlsx`;
    const who = selectedStaffId ? (staff.find((s) => s.id === selectedStaffId)?.name ?? "עובד") : "כל העובדים";
    a.download = `דוח נוכחות - ${who} - ${month}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Per-worker XLSX: the SAME endpoint + exporter, narrowed with staff_id, so
  // the file's numbers are identical to this worker's on-screen block. The
  // human-readable download name is set client-side (no "#").
  function downloadBlockXlsx(block: WorkerBlock) {
    const a = document.createElement("a");
    a.href = `/api/admin/attendance/monthly-report?month=${month}&staff_id=${block.staff.id}&format=xlsx`;
    a.download = `דוח נוכחות - ${block.staff.name} - ${month}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Per-worker print / Save-as-PDF: names the document (→ the PDF filename) and
  // flags the one block; the effect below drives window.print(). No endpoint
  // hit — it prints the already-rendered DOM, so it can't diverge from the
  // numbers on screen.
  //
  // The title is set here and DELIBERATELY NOT restored afterwards. We used to
  // restore it in `afterprint`, but some browsers fire afterprint when the print
  // dialog OPENS (not when it closes), which reset the title before the browser
  // derived the Save-as-PDF filename → the file came out unnamed/generic.
  // Leaving the title decouples the filename from that timing; the tab title
  // (harmless) is simply overwritten by the next print or on navigation.
  function printBlock(block: WorkerBlock) {
    document.title = `דוח נוכחות - ${block.staff.name} - ${heMonthLabel(month)} - ${genDate}`;
    setPrintingId(block.staff.id);
  }

  useEffect(() => {
    if (!printingId) return;
    document.body.classList.add("printing-report-block");
    // Print on the next frame so the portal copy of the block is committed to
    // the DOM before the print dialog snapshots the page.
    const raf = requestAnimationFrame(() => window.print());
    // afterprint ONLY undoes the print-isolation (body class + printingId), never
    // the document title — see printBlock for why the title is left in place.
    const done = () => {
      document.body.classList.remove("printing-report-block");
      setPrintingId(null);
    };
    window.addEventListener("afterprint", done, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("printing-report-block");
    };
  }, [printingId]);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={15} strokeWidth={1.5} className="text-accent shrink-0" />
        <h2 className="font-heading text-base font-bold flex-1 text-start">דוח נוכחות חודשי</h2>
      </div>
      <p className="text-caption text-muted mb-3">
        בלוק אחד לכל עובד — לצילום ושליחה לאישור לפני שכר. כולל שכירים ועצמאיים, כל יום בחודש, וסימון חופש/מחלה כשקיים.
      </p>
      {/* PDF-target hint: the browser's "Save as PDF" reads the filename from
          document.title; Windows' "Microsoft Print to PDF" ignores it and opens
          a blank Save dialog. Not a bug — see SYSTEM_MAP gotcha. */}
      <p className="text-micro text-muted mb-3 flex items-start gap-1">
        <Printer size={11} strokeWidth={1.5} className="shrink-0 mt-0.5" />
        <span>בהדפסה ל-PDF בחר <b>&quot;שמור כ-PDF&quot; (Save as PDF)</b> של הדפדפן — לא &quot;Microsoft Print to PDF&quot; — אחרת שם הקובץ יֵצא ריק.</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
        <div>
          <label className="block text-caption text-muted mb-1 font-body">חודש</label>
          <MonthField
            value={month}
            onChange={(v) => { setMonth(v); setData(null); }}
            max={currentMonth()}
          />
        </div>
        <div>
          <label className="block text-caption text-muted mb-1 font-body">עובד</label>
          <select
            value={selectedStaffId}
            onChange={(e) => { setSelectedStaffId(e.target.value); setData(null); }}
            className="w-full border border-warm-gray-light bg-bone text-charcoal text-content px-3 py-2 focus:outline-none focus:border-accent"
          >
            <option value="">כל העובדים</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.active === false ? " (לא פעיל)" : ""}</option>
            ))}
          </select>
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
          title={selectedStaffId ? "הורד אקסל של העובד שנבחר" : "הורד אקסל של כל העובדים"}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-accent text-accent text-sm font-semibold hover:bg-accent hover:text-bone disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {selectedStaffId
            ? <><User size={13} /> הורד אקסל</>
            : <><Users size={13} /> הורד אקסל — כל העובדים</>}
        </button>
      </div>

      {err && (
        <p className="mt-3 flex items-center gap-1.5 text-caption text-red-600">
          <AlertCircle size={12} /> {err}
        </p>
      )}

      {data && (data.pendingCount ?? 0) > 0 && (
        <div className="mt-4 flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2.5">
          <AlertTriangle size={15} strokeWidth={1.5} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold tabular-nums">{data.pendingCount}</span> רשומות נוכחות ממתינות לאישור בחודש זה — הן <span className="font-bold">אינן</span> נכללות בדוח. אשר אותן בטאב נוכחות כדי שייכללו.
          </div>
        </div>
      )}

      {data && (
        <div className="mt-6 space-y-6">
          {data.blocks.length === 0 && (
            <p className="text-content text-muted text-center py-4">אין עובדים בהיקף הדוח.</p>
          )}
          {data.blocks.map((b) => (
            <WorkerBlockCard
              key={b.staff.id}
              block={b}
              month={data.month}
              genDate={genDate}
              onDownloadXlsx={() => downloadBlockXlsx(b)}
              onPrint={() => printBlock(b)}
            />
          ))}
        </div>
      )}

      {/* Print target — a COPY of the one block being printed, portaled to
          <body> root. Off-screen normally (.report-print-root is display:none);
          the print stylesheet (globals.css) shows only this and hides the rest
          of the page. Its buttons are print:hidden so they never reach the PDF. */}
      {printingId && data && (() => {
        const target = data.blocks.find((b) => b.staff.id === printingId);
        return target
          ? createPortal(
              <div className="report-print-root">
                <WorkerBlockCard
                  block={target}
                  month={data.month}
                  genDate={genDate}
                  onDownloadXlsx={() => {}}
                  onPrint={() => {}}
                />
              </div>,
              document.body,
            )
          : null;
      })()}
    </Card>
  );
}

// Per-worker card. Border + background separate one block from the next
// so a screenshot cropped to one block reads as a self-contained slip.
// The two buttons trigger this worker's own XLSX / print — they carry
// `print:hidden` so they never appear in the printed slip.
function WorkerBlockCard({
  block, month, genDate, onDownloadXlsx, onPrint,
}: {
  block: WorkerBlock;
  month: string;
  genDate: string;
  onDownloadXlsx: () => void;
  onPrint: () => void;
}) {
  const classification = block.staff.is_freelancer ? "עצמאי" : "שכיר";
  return (
    <div className="border-2 border-charcoal/30 bg-white shadow-sm">
      {/* Title bar — filled, so the screenshot's top edge is obvious */}
      <div className="bg-bone-dark border-b-2 border-charcoal/30 px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-base font-bold text-charcoal">
            {block.staff.name}
            {block.staff.active === false && (
              <span className="ms-2 text-caption font-normal text-muted">(לא פעיל)</span>
            )}
          </p>
          <p className="text-caption text-muted mt-0.5">
            {classification} · {heMonthLabel(month)}
          </p>
          {/* Print-only: generation date, so the printed slip / PDF is
              self-identifying (name + month above, date here). */}
          <p className="hidden print:block text-caption text-muted mt-0.5">
            הופק: {genDate}
          </p>
        </div>
        {/* Actions — hidden in print so they don't land in the PDF. */}
        <div className="flex items-center gap-2 shrink-0 print:hidden">
          <button
            onClick={onDownloadXlsx}
            className="flex items-center gap-1 px-2.5 py-1.5 text-micro font-semibold border border-accent/40 text-accent hover:bg-accent hover:text-bone transition-colors whitespace-nowrap"
          >
            <User size={12} /> אקסל של עובד זה
          </button>
          <button
            onClick={onPrint}
            title='לשם קובץ תקין בחר "שמור כ-PDF" (Save as PDF) — לא "Microsoft Print to PDF"'
            className="flex items-center gap-1 px-2.5 py-1.5 text-micro font-semibold border border-accent/40 text-accent hover:bg-accent hover:text-bone transition-colors whitespace-nowrap"
          >
            <Printer size={12} /> הדפס / PDF
          </button>
        </div>
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
