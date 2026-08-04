/**
 * GET /api/admin/attendance/monthly-report?month=YYYY-MM[&format=xlsx]
 *
 * A "cuttable" per-worker attendance report for a chosen month, used by
 * the admin to send each worker their own block for approval before
 * payroll runs. The screen view (default JSON) and the XLSX file share
 * the SAME per-worker aggregation (see lib/monthly-attendance-report.ts)
 * so both surfaces show the exact same numbers.
 *
 *   JSON  → { month, from, to, blocks: WorkerBlock[] }  — one block per
 *           active worker (employee + freelancer). Days include EVERY
 *           calendar day except Saturday; empty days appear as status
 *           "empty" so the report reads as a continuous month.
 *   xlsx  → binary workbook. One sheet, one block per worker separated by
 *           blank rows + a bordered header row. The visual matches the
 *           screen so an admin can screenshot a block and it lines up
 *           with the sheet an accountant sees.
 *
 * Auth: admin (all workers) or foreman (workers who attended a project
 * they own). Same scope pattern the rest of /admin/attendance uses.
 * Filters by clock_at (workDate) — the SQL query widens ±35 days on
 * created_at so retroactive backfills survive; the aggregation helper
 * clamps back to the month.
 */

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerClient } from "../../../../../lib/supabase";
import {
  isAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";
import { israelDayStartISO, israelDayEndISO } from "../../../../../lib/israel-time";
import { fetchAllRows } from "../../../../../lib/supabase-pagination";
import { workDate, israelYMD } from "../../../../../lib/attendance-time";
import { includeInReport } from "../../../../../lib/payroll-include";
import { filterApprovedForPay } from "../../../../../lib/payroll-attendance";
import {
  buildMonthlyReport,
  type MonthlyStaff,
  type MonthlyReportAttendanceRow,
  type MonthlyReportVacationRow,
  type WorkerBlock,
  type DayRow,
} from "../../../../../lib/monthly-attendance-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function monthBounds(month: string): { from: string; to: string } {
  const [yStr, mStr] = month.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const from = `${yStr}-${mStr}-01`;
  // Last day: go to first of next month, subtract 1 day.
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(new Date(`${nextMonth}T12:00:00Z`).getTime() - 86_400_000)
    .toISOString().slice(0, 10);
  return { from, to: last };
}

function shiftYMD(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const STATUS_LABEL_HE: Record<DayRow["status"], string> = {
  "present":        "",
  "in-progress":    "בעבודה",
  "no-exit":        "ללא יציאה",
  "no-entry":       "ללא כניסה",
  "vacation":       "חופש",
  "sick":           "מחלה",
  "absent-marker":  "היעדרות",
  "empty":          "",
};

function heMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "long",
  }).format(new Date(`${y}-${m}-15T12:00:00Z`));
}

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month  = searchParams.get("month");
  const format = searchParams.get("format") ?? "json";
  // Optional single-worker filter. When present, the report is narrowed to
  // exactly one worker AFTER the normal scope/inclusion rules — so a foreman
  // still can't pull a worker outside their projects, and the deactivated-but-
  // worked inclusion still applies. The aggregation itself is UNCHANGED: the
  // same buildMonthlyReport runs on a one-element staff array, so a single
  // worker's numbers are byte-identical to their block in the full report.
  const staffIdFilter = searchParams.get("staff_id");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month נדרש (YYYY-MM)" }, { status: 400 });
  }

  const { from, to } = monthBounds(month);
  const supabase = createServerClient();

  // Foreman scope: only workers who touched projects they own.
  const isAdmin = getAdminRoleFromRequest(req) === "admin";
  let allowedProjectIds: string[] | null = null;
  if (!isAdmin) {
    const foremanStaffId = getForemanStaffIdFromRequest(req);
    if (!foremanStaffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: fp } = await supabase
      .from("projects")
      .select("id")
      .eq("foreman_id", foremanStaffId);
    allowedProjectIds = (fp ?? []).map((p: { id: string }) => p.id);
    if (allowedProjectIds.length === 0) {
      return NextResponse.json({ month, from, to, blocks: [] });
    }
  }

  // ── Staff list ──────────────────────────────────────────────────────────
  // NOT filtered by active=true — a worker deactivated after working the
  // month must still appear (same money concern as payroll). Inactive rows
  // are kept only if they clocked hours this month (admin branch below);
  // dormant inactive stay out. deleted_at IS NULL still excludes deleted.
  // Managers (roles other than "עובד"/"ממונה") and attendance-exempt staff
  // are still excluded — they don't clock.
  const { data: staffRaw, error: staffErr } = await supabase
    .from("staff")
    .select("id, name, is_freelancer, employment_type, role, active, deleted_at, attendance_exempt")
    .is("deleted_at", null)
    .in("role", ["עובד", "ממונה"])
    .eq("attendance_exempt", false)
    .order("name", { ascending: true });
  if (staffErr) {
    console.error("[monthly-report] staff", JSON.stringify(staffErr));
    return NextResponse.json({ error: staffErr.message }, { status: 500 });
  }
  const staff = (staffRaw ?? []) as MonthlyStaff[];

  // ── Attendance (widened ±35 on created_at — C2/C3 fix pattern) ─────────
  // Fetch with status, gate in JS (mirrors the payroll routes): the report
  // body shows approved only; pending (foreman awaiting review) and rejected
  // are excluded, with pending surfaced as a separate count/warning.
  // Paginate: a full month across all workers exceeds the 1000-row cap and used
  // to truncate silently — the report went blank from mid-month (rows past 1000
  // in clock_at order were dropped). Order (clock_at, id) = the existing
  // chronological order + an id tiebreaker so paging is total (no gaps).
  // buildMonthlyReport re-sorts each day internally, so order only matters for
  // completeness here. fetchAllRows throws on any page error → no partial report.
  type RawRow = MonthlyReportAttendanceRow & { status?: string | null };
  let attRawAll: RawRow[];
  try {
    attRawAll = await fetchAllRows<RawRow>(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from("attendance")
        .select("staff_id, action, clock_at, created_at, status, project:project_id(name)")
        .is("deleted_at", null)
        .gte("created_at", israelDayStartISO(shiftYMD(from, -35)))
        .lte("created_at", israelDayEndISO(shiftYMD(to, +35)));
      if (allowedProjectIds !== null) {
        q = q.in("project_id", allowedProjectIds); // filters BEFORE order
      }
      return q.order("clock_at", { ascending: true }).order("id", { ascending: true });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "attendance fetch failed";
    console.error("[monthly-report] att", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  const attRaw = filterApprovedForPay(
    (attRawAll ?? []) as unknown as (MonthlyReportAttendanceRow & { status?: string | null })[],
  );

  const { data: vacRaw, error: vacErr } = await supabase
    .from("vacation_days")
    .select("staff_id, date, half_day")
    .gte("date", from)
    .lte("date", to);
  if (vacErr) {
    console.error("[monthly-report] vac", JSON.stringify(vacErr));
    return NextResponse.json({ error: vacErr.message }, { status: 500 });
  }

  // Pending attendance in the month (NOT in the approved report body) —
  // counted from the SAME fetch (already deleted-null + project-scoped +
  // widened window), narrowed to status='pending' and work date in [from, to].
  const pendingCount = ((attRawAll ?? []) as unknown as (MonthlyReportAttendanceRow & { status?: string | null })[])
    .filter((r) => {
      if (r.status !== "pending" || !r.staff_id) return false;
      // A single-worker report must show only that worker's pending count,
      // not the whole company's, or the slip's warning would mislead.
      if (staffIdFilter && r.staff_id !== staffIdFilter) return false;
      const ymd = israelYMD(workDate(r));
      return ymd >= from && ymd <= to;
    }).length;

  // Staff whose attendance actually falls inside the report month [from, to]
  // (attRaw is widened ±35 days on created_at, so filter by the work date).
  // Drives the "deactivated-but-worked" inclusion.
  const workedInMonth = new Set<string>();
  for (const r of (attRaw ?? []) as unknown as MonthlyReportAttendanceRow[]) {
    if (!r.staff_id) continue;
    const ymd = israelYMD(workDate(r));
    if (ymd >= from && ymd <= to) workedInMonth.add(r.staff_id);
  }

  // Foreman scope on staff: only workers who appeared in the (already
  // project-scoped) attendance slice — unchanged, and now naturally includes
  // a deactivated worker who clocked on their project.
  // Admin scope: active workers + inactive workers who clocked this month
  // (includeInReport). Dormant inactive workers stay out.
  let scopedStaff: MonthlyStaff[];
  if (allowedProjectIds !== null) {
    const seen = new Set<string>();
    for (const r of (attRaw ?? []) as unknown as MonthlyReportAttendanceRow[]) {
      if (r.staff_id) seen.add(r.staff_id);
    }
    scopedStaff = staff.filter((s) => seen.has(s.id));
  } else {
    scopedStaff = staff.filter((s) => includeInReport(s.active ?? true, workedInMonth.has(s.id)));
  }

  // Single-worker narrowing happens here — after scope + inclusion, before the
  // (untouched) aggregation. Empty result if the id isn't in the caller's scope.
  const reportStaff = staffIdFilter
    ? scopedStaff.filter((s) => s.id === staffIdFilter)
    : scopedStaff;

  const blocks = buildMonthlyReport(
    reportStaff,
    (attRaw ?? []) as unknown as MonthlyReportAttendanceRow[],
    (vacRaw ?? []) as unknown as MonthlyReportVacationRow[],
    from,
    to,
  );

  if (format !== "xlsx") {
    return NextResponse.json({ month, from, to, blocks, pendingCount });
  }

  // ── XLSX ────────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Binyan Eitan";
  wb.created = new Date();
  const monthLabel = heMonthLabel(month);
  const sheet = wb.addWorksheet(`נוכחות ${monthLabel}`, { views: [{ rightToLeft: true }] });

  // Single-sheet layout: one worker block per row-cluster. Each block has:
  //   • title row  — bold, filled: "<name> — <employee|freelancer> — <month>"
  //   • header row — bold: תאריך | יום | כניסה | יציאה | שעות | סטטוס | פרויקט
  //   • day rows
  //   • total row  — bold, filled: "סה"כ ימי עבודה: X · סה"כ שעות: Y"
  //   • blank row  — spacer between workers (cut line)
  sheet.columns = [
    { header: "תאריך",     key: "date",   width: 12 },
    { header: "יום",       key: "day",    width: 10 },
    { header: "כניסה",     key: "entry",  width: 8  },
    { header: "יציאה",     key: "exit",   width: 8  },
    { header: "שעות",      key: "hours",  width: 8  },
    { header: "סטטוס",     key: "status", width: 12 },
    { header: "פרויקט",    key: "project",width: 22 },
  ];
  // Suppress the default single header row — we render per-block headers.
  sheet.spliceRows(1, 1);

  const FILL_TITLE:   ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E7E3" } };
  const FILL_HEADER:  ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F2EE" } };
  const FILL_TOTAL:   ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFECE5" } };
  const BORDER:       Partial<ExcelJS.Borders> = {
    top:    { style: "thin", color: { argb: "FF2D2926" } },
    bottom: { style: "thin", color: { argb: "FF2D2926" } },
    left:   { style: "thin", color: { argb: "FFCCCCCC" } },
    right:  { style: "thin", color: { argb: "FFCCCCCC" } },
  };

  // Pending warning at the very top so it's the first thing seen.
  if (pendingCount > 0) {
    const warnRow = sheet.addRow([
      `⚠ ${pendingCount} רשומות נוכחות ממתינות לאישור אינן כלולות בדוח זה. אשר אותן והפק דוח מעודכן.`,
    ]);
    sheet.mergeCells(warnRow.number, 1, warnRow.number, 7);
    warnRow.font = { bold: true, color: { argb: "FF9A6A00" } };
    warnRow.alignment = { horizontal: "right", vertical: "middle" };
    warnRow.height = 20;
    sheet.addRow([]);
  }

  for (const b of blocks) {
    const classification = b.staff.is_freelancer ? "עצמאי" : "שכיר";
    const inactiveTag = b.staff.active === false ? " (לא פעיל)" : "";
    // Title row — merged across all 7 columns
    const titleRow = sheet.addRow([`${b.staff.name}${inactiveTag} · ${classification} · ${monthLabel}`]);
    sheet.mergeCells(titleRow.number, 1, titleRow.number, 7);
    titleRow.font = { bold: true, size: 12 };
    titleRow.fill = FILL_TITLE;
    titleRow.border = BORDER;
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 22;

    // Column-header row
    const headerRow = sheet.addRow({
      date: "תאריך", day: "יום", entry: "כניסה", exit: "יציאה",
      hours: "שעות", status: "סטטוס", project: "פרויקט",
    });
    headerRow.font = { bold: true };
    headerRow.fill = FILL_HEADER;
    headerRow.alignment = { horizontal: "center" };
    headerRow.eachCell((cell) => { cell.border = BORDER; });

    // Day rows
    for (const d of b.days) {
      const statusText = STATUS_LABEL_HE[d.status] + (
        d.status === "vacation" && d.halfDayVacation ? " (חצי יום)" : ""
      );
      const row = sheet.addRow({
        date:    d.date.split("-").reverse().join("/"),
        day:     d.dayName,
        entry:   d.entry ?? (d.status === "empty" ? "" : "—"),
        exit:    d.exit  ?? (d.status === "empty" ? "" : "—"),
        hours:   d.hours ?? "",
        status:  statusText,
        project: d.project ?? "",
      });
      row.eachCell((cell) => { cell.border = BORDER; });
      if (d.status === "vacation" || d.status === "sick" || d.status === "absent-marker") {
        row.font = { italic: true, color: { argb: "FF8D775F" } };
      }
    }

    // Totals row — merged across 5 cols on the left, 2 numeric cells on right
    const totalRow = sheet.addRow({
      date:    "סה\"כ",
      day:     "",
      entry:   "",
      exit:    "ימי עבודה:",
      hours:   b.totals.workDays,
      status:  "שעות:",
      project: b.totals.workHours.toFixed(2),
    });
    totalRow.font = { bold: true };
    totalRow.fill = FILL_TOTAL;
    totalRow.eachCell((cell) => { cell.border = BORDER; });

    // Blank spacer row for visual cutting between workers.
    sheet.addRow([]);
    sheet.addRow([]);
  }

  const buf = await wb.xlsx.writeBuffer();

  // Filename is built HERE, on the server, because the download is an anchor
  // navigation to this route — the browser honours THIS Content-Disposition and
  // ignores the client's `download` attribute, so a client-side name never took
  // effect (that was the bug: the file came out as the ASCII fallback).
  //   • Hebrew name → RFC 5987 `filename*` (UTF-8 percent-encoded), which every
  //     modern browser prefers over plain `filename`.
  //   • ASCII `filename=` kept as a fallback for ancient clients.
  //   • Worker part is sanitised of "#" and "/" (both truncate the saved name)
  //     plus quotes/control chars that would break the header.
  const workerName = staffIdFilter ? (reportStaff[0]?.name ?? "עובד") : "כל העובדים";
  const cleanWorker = workerName.replace(/[#/\\"\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  const niceName = `דוח נוכחות - ${cleanWorker} - ${month}.xlsx`;
  const asciiFallback = `attendance-monthly-${month}${staffIdFilter ? `-${staffIdFilter}` : ""}.xlsx`;
  const encoded = encodeURIComponent(niceName).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
    },
  });
}
