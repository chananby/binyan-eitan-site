/**
 * GET /api/admin/payroll/export?month=YYYY-MM&project_id=...
 *
 * Returns an XLSX binary of the same data as /api/admin/payroll, formatted
 * for handoff to the accountant. RTL columns + Hebrew headers.
 */
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

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
}

interface AttRow {
  staff_id: string;
  action: string;
  clock_at: string | null;
  created_at: string;
}

interface VacRow {
  staff_id: string;
  date: string;
  half_day: boolean;
}

function workDate(rec: { clock_at: string | null; created_at: string }): Date {
  return rec.clock_at ? new Date(rec.clock_at) : new Date(rec.created_at);
}
function toIsraelYMD(d: Date): string {
  return d.toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
}

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

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month query param required (YYYY-MM)" }, { status: 400 });
  }

  const monthStart = `${month}-01`;
  const [yStr, mStr] = month.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const supabase = createServerClient();

  const { data: staffData, error: staffErr } = await supabase
    .from("staff")
    .select("id, name, national_id, employment_type, hourly_rate, daily_rate, monthly_global_salary, travel_allowance, pension_status, holiday_eligible, role")
    .eq("active", true)
    .in("role", ["עובד", "ממונה"])
    .order("name", { ascending: true });
  if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 });
  const staff = (staffData ?? []) as StaffRow[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let attQuery: any = supabase
    .from("attendance")
    .select("staff_id, action, clock_at, created_at")
    .gte("created_at", `${monthStart}T00:00:00+03:00`)
    .lt("created_at", `${nextMonth}T00:00:00+03:00`);
  if (projectId) attQuery = attQuery.eq("project_id", projectId);
  const { data: attData } = await attQuery;

  const { data: vacData } = await supabase
    .from("vacation_days")
    .select("staff_id, date, half_day")
    .gte("date", monthStart)
    .lt("date", nextMonth);

  // Aggregate attendance per staff
  const attMap = new Map<string, { days: number; hours: number }>();
  {
    const byStaff = new Map<string, Map<string, { entries: Date[]; exits: Date[] }>>();
    for (const rec of (attData ?? []) as AttRow[]) {
      const d = workDate(rec);
      const ymd = toIsraelYMD(d);
      if (!ymd.startsWith(month)) continue;
      if (!byStaff.has(rec.staff_id)) byStaff.set(rec.staff_id, new Map());
      const byDate = byStaff.get(rec.staff_id)!;
      if (!byDate.has(ymd)) byDate.set(ymd, { entries: [], exits: [] });
      const day = byDate.get(ymd)!;
      if (rec.action === "in" || rec.action === "כניסה") day.entries.push(d);
      else if (rec.action === "out" || rec.action === "יציאה") day.exits.push(d);
    }
    for (const [sid, byDate] of byStaff) {
      let days = 0, hours = 0;
      for (const day of byDate.values()) {
        const firstIn = day.entries[0];
        const lastOut = day.exits[day.exits.length - 1];
        if (!firstIn) continue;
        days++;
        if (lastOut) {
          const ms = lastOut.getTime() - firstIn.getTime();
          if (ms > 0) hours += ms / 3_600_000;
        }
      }
      attMap.set(sid, { days, hours: Math.round(hours * 100) / 100 });
    }
  }

  // Aggregate vacation per staff
  const vacMap = new Map<string, number>();
  for (const r of (vacData ?? []) as VacRow[]) {
    const v = r.half_day ? 0.5 : 1;
    vacMap.set(r.staff_id, (vacMap.get(r.staff_id) ?? 0) + v);
  }

  // ── Build the workbook ──────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Binyan Eitan";
  wb.created = new Date();
  const sheet = wb.addWorksheet(`שכר ${month}`, {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = [
    { header: "שם",            key: "name",            width: 22 },
    { header: "ת.ז.",          key: "national_id",     width: 14 },
    { header: "סוג העסקה",     key: "employment_type", width: 12 },
    { header: "ימי עבודה",     key: "days_worked",     width: 11 },
    { header: "שעות עבודה",    key: "hours_worked",    width: 12 },
    { header: "תעריף שעתי",    key: "hourly_rate",     width: 12 },
    { header: "תעריף יומי",    key: "daily_rate",      width: 12 },
    { header: "שכר גלובלי",    key: "monthly_global",  width: 13 },
    { header: "ימי חופשה",     key: "vacation_days",   width: 11 },
    { header: "זכאי לחגים",    key: "holiday",         width: 12 },
    { header: "דמי נסיעות",    key: "travel",          width: 12 },
    { header: "פנסיה",         key: "pension",         width: 18 },
    { header: "סה\"כ ברוטו",   key: "gross",           width: 14 },
  ];

  // Style the header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E7E3" } };
  headerRow.height = 22;

  // Data rows
  let grandTotal = 0;
  for (const s of staff) {
    const att = attMap.get(s.id) ?? { days: 0, hours: 0 };
    const vac = vacMap.get(s.id) ?? 0;
    let gross = 0;
    if (s.employment_type === "global") gross = s.monthly_global_salary ?? 0;
    else if (s.employment_type === "daily") gross = (s.daily_rate ?? 0) * att.days;
    else gross = Math.round((s.hourly_rate ?? 0) * att.hours * 100) / 100;
    grandTotal += gross;

    sheet.addRow({
      name:            s.name,
      national_id:     s.national_id ?? "",
      employment_type: EMPLOYMENT_LABELS[s.employment_type] ?? s.employment_type,
      days_worked:     att.days,
      hours_worked:    att.hours,
      hourly_rate:     s.employment_type === "hourly" ? (s.hourly_rate ?? 0) : "",
      daily_rate:      s.employment_type === "daily"  ? (s.daily_rate  ?? 0) : "",
      monthly_global:  s.employment_type === "global" ? (s.monthly_global_salary ?? 0) : "",
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
  const filename = `payroll-${month}${projectId ? "-project" : ""}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
