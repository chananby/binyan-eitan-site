/**
 * GET /api/admin/payroll/export?month=YYYY-MM&type=employees|freelancers&project_id=...
 *
 * Returns an XLSX binary of the same data as /api/admin/payroll, formatted
 * for handoff to the accountant. RTL columns + Hebrew headers.
 *
 * The `type` param is REQUIRED — the accountant receives separate reports
 * for employees (שכירים) and freelancers/contractors (עצמאים) because the
 * downstream processing differs (payslip vs. invoice). Splitting at export
 * time keeps each file focused and lets us hide irrelevant columns:
 *   employees    → all columns (pension + holiday eligibility matter)
 *   freelancers  → pension + "זכאי לחגים" columns removed
 */
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { israelDayStartISO } from "../../../../../lib/israel-time";
import {
  aggregateAttendance,
  aggregateVacation,
  computeGross,
  type AttendanceRec,
  type VacationRec,
} from "../../../../../lib/payroll-aggregate";
import { getRatesForMonth } from "../../../../../lib/staff-rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StaffRow {
  id: string;
  name: string;
  national_id: string | null;
  employment_type: string;
  hourly_rate: number | null;
  daily_rate: number | null;
  monthly_global_salary: number | null;
  travel_allowance: boolean;
  pension_status: string | null;
  holiday_eligible: boolean;
  role: string;
  start_date: string | null;
}

type AttRow = AttendanceRec;
type VacRow = VacationRec & { date: string };

const EMPLOYMENT_LABELS: Record<string, string> = {
  hourly: "שעתי",
  daily:  "יומי",
  global: "גלובלי",
};

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const projectId = searchParams.get("project_id");
  const type = searchParams.get("type");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month query param required (YYYY-MM)" }, { status: 400 });
  }
  if (type !== "employees" && type !== "freelancers") {
    return NextResponse.json(
      { error: "type query param required: 'employees' or 'freelancers'" },
      { status: 400 }
    );
  }
  const wantFreelancers = type === "freelancers";

  const monthStart = `${month}-01`;
  const [yStr, mStr] = month.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const supabase = createServerClient();

  const { data: staffData, error: staffErr } = await supabase
    .from("staff")
    .select("id, name, national_id, employment_type, hourly_rate, daily_rate, monthly_global_salary, travel_allowance, pension_status, holiday_eligible, role, start_date")
    .eq("active", true)
    .eq("is_freelancer", wantFreelancers)
    .in("role", ["עובד", "ממונה"])
    .order("name", { ascending: true });
  if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 });
  const staff = (staffData ?? []) as StaffRow[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let attQuery: any = supabase
    .from("attendance")
    .select("staff_id, action, clock_at, created_at")
    .is("deleted_at", null)
    .gte("created_at", israelDayStartISO(monthStart))
    .lt("created_at", israelDayStartISO(nextMonth));
  if (projectId) attQuery = attQuery.eq("project_id", projectId);
  const { data: attData } = await attQuery;

  const { data: vacData } = await supabase
    .from("vacation_days")
    .select("staff_id, date, half_day")
    .gte("date", monthStart)
    .lt("date", nextMonth);

  const attMap = aggregateAttendance((attData ?? []) as AttRow[], month);
  const vacMap = aggregateVacation((vacData ?? []) as VacRow[]);

  // ── Build the workbook ──────────────────────────────────────────────────
  // Hebrew month label for the sheet title — "מאי 2026" rather than 2026-05.
  // Anchor at noon UTC so DST never bumps the month.
  const monthLabel = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "long",
  }).format(new Date(`${monthStart}T12:00:00Z`));

  const titleHe = wantFreelancers
    ? `דוח שכר עצמאים - ${monthLabel}`
    : `דוח שכר שכירים - ${monthLabel}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Binyan Eitan";
  wb.created = new Date();
  const sheet = wb.addWorksheet(titleHe, {
    views: [{ rightToLeft: true }],
  });

  // Column set: freelancers drop pension + holiday eligibility (irrelevant —
  // freelancers invoice for hours/days, no payslip-side calculation needed).
  // Building the array conditionally avoids a column with empty cells.
  sheet.columns = [
    { header: "שם",            key: "name",            width: 22 },
    { header: "ת.ז.",          key: "national_id",     width: 14 },
    { header: "תאריך התחלה",   key: "start_date",      width: 13 },
    { header: "סוג העסקה",     key: "employment_type", width: 12 },
    { header: "ימי עבודה",     key: "days_worked",     width: 11 },
    { header: "שעות עבודה",    key: "hours_worked",    width: 12 },
    { header: "תעריף שעתי",    key: "hourly_rate",     width: 12 },
    { header: "תעריף יומי",    key: "daily_rate",      width: 12 },
    { header: "שכר גלובלי",    key: "monthly_global",  width: 13 },
    { header: "ימי חופשה",     key: "vacation_days",   width: 11 },
    ...(wantFreelancers ? [] : [
      { header: "זכאי לחגים",  key: "holiday",         width: 12 },
    ]),
    { header: "דמי נסיעות",    key: "travel",          width: 12 },
    ...(wantFreelancers ? [] : [
      { header: "פנסיה",       key: "pension",         width: 18 },
    ]),
    { header: "סה\"כ ברוטו",   key: "gross",           width: 14 },
  ];

  // Style the header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E7E3" } };
  headerRow.height = 22;

  // Rates for the report month — source-of-truth for the gross math.
  // Workers with no staff_rates row fall back to staff legacy columns and
  // get a "⚠️" prefix on their name cell so the accountant sees them.
  const ratesMap = await getRatesForMonth(supabase, staff.map((s) => s.id), month);

  // Data rows
  let grandTotal = 0;
  for (const s of staff) {
    const att = attMap.get(s.id) ?? { days: 0, hours: 0 };
    const vac = vacMap.get(s.id) ?? 0;
    const rateRow  = ratesMap.get(s.id) ?? null;
    const rates    = rateRow ?? {
      hourly_rate: s.hourly_rate,
      daily_rate: s.daily_rate,
      monthly_global_salary: s.monthly_global_salary,
    };
    const gross = computeGross(s, rates, att);
    grandTotal += gross;

    sheet.addRow({
      name:            (rateRow ? "" : "⚠️ ") + s.name,
      national_id:     s.national_id ?? "",
      // Display as DD/MM/YYYY for the accountant; empty if not set.
      start_date:      s.start_date ? s.start_date.split("-").reverse().join("/") : "",
      employment_type: EMPLOYMENT_LABELS[s.employment_type] ?? s.employment_type,
      // Global workers earn their monthly salary independent of hours/days.
      // Print "—" when the underlying value is 0 so accountants don't read
      // it as "worked zero hours this month" — the gross is fixed regardless.
      days_worked:     s.employment_type === "global" && att.days  === 0 ? "—" : att.days,
      hours_worked:    s.employment_type === "global" && att.hours === 0 ? "—" : att.hours,
      hourly_rate:     s.employment_type === "hourly" ? (rates.hourly_rate ?? 0) : "",
      daily_rate:      s.employment_type === "daily"  ? (rates.daily_rate  ?? 0) : "",
      monthly_global:  s.employment_type === "global" ? (rates.monthly_global_salary ?? 0) : "",
      vacation_days:   vac,
      holiday:         s.holiday_eligible ? "כן" : "לא",
      travel:          s.travel_allowance ? "כן" : "לא",
      pension:         s.pension_status ?? "",
      gross,
    });
  }

  // Format numeric columns
  ["hourly_rate", "daily_rate", "monthly_global", "gross"].forEach((k) => {
    const col = sheet.getColumn(k);
    col.numFmt = '#,##0.00 ₪;[Red]-#,##0.00 ₪';
    col.alignment = { horizontal: "left" };
  });
  ["days_worked", "hours_worked", "vacation_days"].forEach((k) => {
    const col = sheet.getColumn(k);
    col.alignment = { horizontal: "center" };
  });

  // Total row
  const totalRow = sheet.addRow({
    name: "סה\"כ",
    gross: grandTotal,
  });
  totalRow.font = { bold: true };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F2EE" } };
  totalRow.getCell("gross").numFmt = '#,##0.00 ₪';

  // Borders
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
  const filename = `payroll-${type}-${month}${projectId ? "-project" : ""}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
