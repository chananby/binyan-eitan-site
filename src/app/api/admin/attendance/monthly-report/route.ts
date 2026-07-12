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
  // Admin: all active workers + foremen. Foreman: filtered downstream via
  // attendance rows on their projects. Managers (roles other than "עובד" /
  // "ממונה") are still excluded — they don't clock and shouldn't appear.
  const { data: staffRaw, error: staffErr } = await supabase
    .from("staff")
    .select("id, name, is_freelancer, employment_type, role, active, deleted_at, attendance_exempt")
    .eq("active", true)
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
  let attQuery = supabase
    .from("attendance")
    .select("staff_id, action, clock_at, created_at, project:project_id(name)")
    .is("deleted_at", null)
    .gte("created_at", israelDayStartISO(shiftYMD(from, -35)))
    .lte("created_at", israelDayEndISO(shiftYMD(to, +35)))
    .order("clock_at", { ascending: true });
  if (allowedProjectIds !== null) {
    attQuery = attQuery.in("project_id", allowedProjectIds);
  }
  const { data: attRaw, error: attErr } = await attQuery;
  if (attErr) {
    console.error("[monthly-report] att", JSON.stringify(attErr));
    return NextResponse.json({ error: attErr.message }, { status: 500 });
  }

  const { data: vacRaw, error: vacErr } = await supabase
    .from("vacation_days")
    .select("staff_id, date, half_day")
    .gte("date", from)
    .lte("date", to);
  if (vacErr) {
    console.error("[monthly-report] vac", JSON.stringify(vacErr));
    return NextResponse.json({ error: vacErr.message }, { status: 500 });
  }

  // Foreman scope on staff: only include workers who actually appeared in
  // the (already project-scoped) attendance slice. Admin skips this step
  // and gets every active worker.
  let scopedStaff: MonthlyStaff[] = staff;
  if (allowedProjectIds !== null) {
    const seen = new Set<string>();
    for (const r of (attRaw ?? []) as unknown as MonthlyReportAttendanceRow[]) {
      if (r.staff_id) seen.add(r.staff_id);
    }
    scopedStaff = staff.filter((s) => seen.has(s.id));
  }

  const blocks = buildMonthlyReport(
    scopedStaff,
    (attRaw ?? []) as unknown as MonthlyReportAttendanceRow[],
    (vacRaw ?? []) as unknown as MonthlyReportVacationRow[],
    from,
    to,
  );

  if (format !== "xlsx") {
    return NextResponse.json({ month, from, to, blocks });
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

  for (const b of blocks) {
    const classification = b.staff.is_freelancer ? "עצמאי" : "שכיר";
    // Title row — merged across all 7 columns
    const titleRow = sheet.addRow([`${b.staff.name} · ${classification} · ${monthLabel}`]);
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
  const filename = `attendance-monthly-${month}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
