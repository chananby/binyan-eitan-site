/**
 * GET /api/admin/staff/export
 *
 * Full active-staff XLSX dump for the admin: profile (name, ID, phone,
 * role, classification, start date, tenure, employment type, rates,
 * benefits) + activity summary for the trailing three calendar months
 * (work days, hours, and last clock event).
 *
 * Sister export to /api/admin/payroll/export — same RTL layout language
 * and currency formatting, different focus (this report is people-first
 * rather than pay-period-first; it's the file the admin opens before a
 * raise / review / scope-of-work conversation).
 */

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { israelDayStartISO } from "../../../../../lib/israel-time";
import {
  aggregateAttendance,
  type AttendanceRec,
} from "../../../../../lib/payroll-aggregate";
import { getRatesForMonth } from "../../../../../lib/staff-rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StaffRow {
  id: string;
  name: string;
  national_id: string | null;
  phone: string | null;
  role: string;
  is_freelancer: boolean;
  start_date: string | null;
  employment_type: string;
  hourly_rate: number | null;
  daily_rate: number | null;
  travel_allowance: boolean;
  pension_status: string | null;
  holiday_eligible: boolean;
  notes: string | null;
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  hourly: "שעתי",
  daily:  "יומי",
  global: "גלובלי",
};

// Israel-local "YYYY-MM-DD" anchored at noon UTC so DST never shifts the day.
function israelTodayYMD(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
}

// "DD/MM/YYYY" for accountant-friendly display.
function ymdToDDMMYYYY(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

// Years + months of tenure from a YYYY-MM-DD start date through today.
// Anchored at UTC noon to ignore DST when subtracting months.
function tenureLabel(startYmd: string | null): string {
  if (!startYmd) return "—";
  const start = new Date(`${startYmd}T12:00:00Z`);
  if (Number.isNaN(start.getTime())) return "—";
  const now = new Date();
  let years  = now.getUTCFullYear() - start.getUTCFullYear();
  let months = now.getUTCMonth()    - start.getUTCMonth();
  if (now.getUTCDate() < start.getUTCDate()) months -= 1; // partial month doesn't count
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0 && months <= 0) return "פחות מחודש";
  if (years === 0)  return `${months} חודשים`;
  if (months === 0) return `${years} שנים`;
  return `${years} שנים ${months} חודשים`;
}

// Latest IN or OUT timestamp for a worker, surfaced as "DD/MM/YYYY HH:MM"
// in Israel TZ. Returns "—" when the worker has no attendance in window.
function lastSeenLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Three months back from the current Israel-local month, used both for the
// attendance query and for the activity aggregation bucket.
function threeMonthsAgoYMD(): string {
  const today = israelTodayYMD();
  const [y, m] = today.split("-").map(Number);
  // Roll back two months — current + previous two = 3 calendar months covered.
  let ty = y;
  let tm = m - 2;
  while (tm < 1) { tm += 12; ty -= 1; }
  return `${ty}-${String(tm).padStart(2, "0")}-01`;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: staffData, error: staffErr } = await supabase
    .from("staff")
    .select("id, name, national_id, phone, role, is_freelancer, start_date, employment_type, hourly_rate, daily_rate, travel_allowance, pension_status, holiday_eligible, notes")
    .eq("active", true)
    .is("deleted_at", null)
    .in("role", ["עובד", "ממונה"])
    .order("name", { ascending: true });
  if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 });
  const staff = (staffData ?? []) as StaffRow[];

  // ── Activity window: last 3 calendar months in Israel time ────────────────
  const windowStart = threeMonthsAgoYMD();
  const todayYmd    = israelTodayYMD();

  const { data: attData } = await supabase
    .from("attendance")
    .select("staff_id, action, clock_at, created_at")
    .is("deleted_at", null)
    .gte("created_at", israelDayStartISO(windowStart));

  // Aggregation reuses the same helper that drives /api/admin/payroll/* so
  // days/hours math is byte-identical to the pay slips the accountant sees.
  // The helper expects a "YYYY-MM" prefix that gates which records count —
  // we pass empty string so EVERY record in the queried window is included.
  const attRows = (attData ?? []) as AttendanceRec[];
  // Build a stats map covering the whole 3-month window by aggregating
  // each month separately and summing.
  const months: string[] = [];
  {
    const [sy, sm] = windowStart.split("-").map(Number);
    for (let i = 0; i < 3; i += 1) {
      const my = sm + i > 12 ? sy + 1 : sy;
      const mm = ((sm + i - 1) % 12) + 1;
      months.push(`${my}-${String(mm).padStart(2, "0")}`);
    }
  }
  const combined = new Map<string, { days: number; hours: number }>();
  for (const monthPrefix of months) {
    const monthly = aggregateAttendance(attRows, monthPrefix);
    for (const [sid, stats] of monthly) {
      const acc = combined.get(sid) ?? { days: 0, hours: 0 };
      acc.days  += stats.days;
      acc.hours += stats.hours;
      combined.set(sid, acc);
    }
  }

  // Last seen — newest clock_at (fallback created_at) per worker.
  const lastSeenMap = new Map<string, string>();
  for (const r of attRows) {
    const ts = r.clock_at ?? r.created_at;
    if (!ts) continue;
    const prev = lastSeenMap.get(r.staff_id);
    if (!prev || ts > prev) lastSeenMap.set(r.staff_id, ts);
  }

  // ── Workbook ──────────────────────────────────────────────────────────────
  const todayDDMM = ymdToDDMMYYYY(todayYmd);
  const sheetTitle = `דוח עובדים - ${todayDDMM}`;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Binyan Eitan";
  wb.created = new Date();
  const sheet = wb.addWorksheet(sheetTitle, {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = [
    { header: "שם",                key: "name",            width: 22 },
    { header: "ת.ז.",              key: "national_id",     width: 14 },
    { header: "טלפון",             key: "phone",           width: 14 },
    { header: "תפקיד",             key: "role",            width: 12 },
    { header: "שכיר/עצמאי",        key: "classification",  width: 12 },
    { header: "תחילת עבודה",       key: "start_date",      width: 13 },
    { header: "ותק",               key: "tenure",          width: 16 },
    { header: "סוג העסקה",         key: "employment_type", width: 12 },
    { header: "תעריף שעתי",        key: "hourly_rate",     width: 12 },
    { header: "תעריף יומי",        key: "daily_rate",      width: 12 },
    { header: "נסיעות",            key: "travel",          width: 10 },
    { header: "פנסיה",             key: "pension",         width: 18 },
    { header: "זכאי לחגים",        key: "holiday",         width: 11 },
    { header: "ימי עבודה (3 ח')",  key: "days_worked",     width: 14 },
    { header: 'שעות (3 ח")',        key: "hours_worked",    width: 12 },
    { header: "החתמה אחרונה",      key: "last_seen",       width: 20 },
    { header: "הערות",             key: "notes",           width: 30 },
  ];

  // Style header — same recipe as payroll export so the accountant gets a
  // visually consistent set of files in their inbox.
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E7E3" } };
  headerRow.height = 22;

  // Rates for the *current* month — same source-of-truth as payroll.
  // Workers without a staff_rates row fall back to legacy staff columns
  // and get a "⚠️" prefix on their name cell.
  const currentMonth = todayYmd.slice(0, 7); // YYYY-MM
  const ratesMap = await getRatesForMonth(supabase, staff.map((s) => s.id), currentMonth);

  for (const s of staff) {
    const stats = combined.get(s.id) ?? { days: 0, hours: 0 };
    const last  = lastSeenMap.get(s.id) ?? null;
    const rateRow = ratesMap.get(s.id) ?? null;
    const rates = rateRow ?? {
      hourly_rate: s.hourly_rate,
      daily_rate:  s.daily_rate,
    };
    sheet.addRow({
      name:            (rateRow ? "" : "⚠️ ") + s.name,
      national_id:     s.national_id ?? "",
      phone:           s.phone ?? "",
      role:            s.role,
      classification:  s.is_freelancer ? "עצמאי" : "שכיר",
      start_date:      s.start_date ? ymdToDDMMYYYY(s.start_date) : "",
      tenure:          tenureLabel(s.start_date),
      employment_type: EMPLOYMENT_LABELS[s.employment_type] ?? s.employment_type,
      hourly_rate:     s.employment_type === "hourly" ? (rates.hourly_rate ?? 0) : "",
      daily_rate:      s.employment_type === "daily"  ? (rates.daily_rate  ?? 0) : "",
      travel:          s.travel_allowance ? "כן" : "לא",
      pension:         s.pension_status ?? "",
      holiday:         s.holiday_eligible ? "כן" : "לא",
      days_worked:     stats.days,
      hours_worked:    stats.hours,
      last_seen:       lastSeenLabel(last),
      notes:           s.notes ?? "",
    });
  }

  // Currency formatting on the two rate columns — same mask as payroll.
  ["hourly_rate", "daily_rate"].forEach((k) => {
    const col = sheet.getColumn(k);
    col.numFmt = '#,##0.00 ₪;[Red]-#,##0.00 ₪';
    col.alignment = { horizontal: "left" };
  });
  ["days_worked", "hours_worked"].forEach((k) => {
    const col = sheet.getColumn(k);
    col.alignment = { horizontal: "center" };
  });
  // Notes column reads better wrapped at width 30 than truncated.
  sheet.getColumn("notes").alignment = { wrapText: true, vertical: "top" };

  // Borders across the populated grid — same recipe as the payroll export.
  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top:    { style: "thin", color: { argb: "FFCCCCCC" } },
        left:   { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        right:  { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  const filename = `staff-report-${todayYmd}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
