/**
 * GET /api/admin/payroll?month=YYYY-MM&project_id=...
 *
 * Returns a per-active-staff payroll row for the given month.
 *
 * Each row:
 *   { staff_id, name, national_id, employment_type, days_worked, hours_worked,
 *     hourly_rate, daily_rate, monthly_global_salary,
 *     vacation_days, holiday_eligible, travel_allowance, pension_status,
 *     gross_salary }
 *
 * days_worked / hours_worked come from the attendance table for the month.
 * gross_salary is computed:
 *   - hourly: hours_worked * hourly_rate
 *   - daily:  days_worked  * daily_rate
 *   - global: monthly_global_salary
 *
 * project_id (optional) filters attendance by project. Workers with no
 * activity on the filtered project still appear with zeroed hours/days
 * (so the report covers the whole team).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";
import { israelDayStartISO } from "../../../../lib/israel-time";

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
}

interface AttendanceRow {
  staff_id: string;
  action: string;
  clock_at: string | null;
  created_at: string;
  project_id: string | null;
}

interface VacationRow {
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

/** Compute attendance stats per staff for the given month + optional project filter. */
function aggregateAttendance(
  records: AttendanceRow[],
  monthStart: string, // YYYY-MM
): Map<string, { days: number; hours: number }> {
  // Group by staff_id → date → entries[], exits[]
  const byStaff = new Map<string, Map<string, { entries: Date[]; exits: Date[] }>>();

  for (const rec of records) {
    const d = workDate(rec);
    const ymd = toIsraelYMD(d);
    if (!ymd.startsWith(monthStart)) continue; // outside the month

    if (!byStaff.has(rec.staff_id)) byStaff.set(rec.staff_id, new Map());
    const byDate = byStaff.get(rec.staff_id)!;
    if (!byDate.has(ymd)) byDate.set(ymd, { entries: [], exits: [] });
    const day = byDate.get(ymd)!;
    if (rec.action === "in" || rec.action === "כניסה") day.entries.push(d);
    else if (rec.action === "out" || rec.action === "יציאה") day.exits.push(d);
  }

  const out = new Map<string, { days: number; hours: number }>();
  for (const [staffId, byDate] of byStaff) {
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
    out.set(staffId, { days, hours: Math.round(hours * 100) / 100 });
  }
  return out;
}

function aggregateVacation(records: VacationRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of records) {
    const v = r.half_day ? 0.5 : 1;
    out.set(r.staff_id, (out.get(r.staff_id) ?? 0) + v);
  }
  return out;
}

function computeGross(s: StaffRow, stats: { days: number; hours: number }): number {
  if (s.employment_type === "global") return s.monthly_global_salary ?? 0;
  if (s.employment_type === "daily")  return (s.daily_rate ?? 0) * stats.days;
  // hourly (default)
  return Math.round((s.hourly_rate ?? 0) * stats.hours * 100) / 100;
}

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

  // Fetch active "עובד" + "ממונה" staff (anyone the company pays — admins/manager roles excluded)
  const { data: staffData, error: staffErr } = await supabase
    .from("staff")
    .select("id, name, national_id, employment_type, hourly_rate, daily_rate, monthly_global_salary, travel_allowance, pension_status, holiday_eligible, role")
    .eq("active", true)
    .in("role", ["עובד", "ממונה"])
    .order("name", { ascending: true });
  if (staffErr) {
    console.error("[payroll] staff err:", staffErr.message);
    return NextResponse.json({ error: staffErr.message }, { status: 500 });
  }
  const staff = (staffData ?? []) as (StaffRow & { role: string })[];
  if (staff.length === 0) {
    return NextResponse.json({ month, rows: [] });
  }

  // Attendance — widen by 1 day on each side to catch timezone edges
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let attQuery: any = supabase
    .from("attendance")
    .select("staff_id, action, clock_at, created_at, project_id")
    .gte("created_at", israelDayStartISO(monthStart))
    .lt("created_at", israelDayStartISO(nextMonth));
  if (projectId) attQuery = attQuery.eq("project_id", projectId);
  const { data: attData, error: attErr } = await attQuery;
  if (attErr) {
    console.error("[payroll] attendance err:", attErr.message);
    return NextResponse.json({ error: attErr.message }, { status: 500 });
  }

  // Vacation — month range, all staff (no project filter — vacation isn't per-project)
  const { data: vacData, error: vacErr } = await supabase
    .from("vacation_days")
    .select("staff_id, date, half_day")
    .gte("date", monthStart)
    .lt("date", nextMonth);
  if (vacErr) {
    console.error("[payroll] vacation err:", vacErr.message);
    return NextResponse.json({ error: vacErr.message }, { status: 500 });
  }

  const attStats = aggregateAttendance((attData ?? []) as AttendanceRow[], month);
  const vacStats = aggregateVacation((vacData ?? []) as VacationRow[]);

  const rows = staff.map((s) => {
    const stats = attStats.get(s.id) ?? { days: 0, hours: 0 };
    const vacation_days = vacStats.get(s.id) ?? 0;
    const gross_salary = computeGross(s, stats);
    return {
      staff_id: s.id,
      name: s.name,
      national_id: s.national_id,
      employment_type: s.employment_type,
      days_worked: stats.days,
      hours_worked: stats.hours,
      hourly_rate: s.hourly_rate,
      daily_rate: s.daily_rate,
      monthly_global_salary: s.monthly_global_salary,
      vacation_days,
      holiday_eligible: s.holiday_eligible,
      travel_allowance: s.travel_allowance,
      pension_status: s.pension_status,
      gross_salary,
    };
  });

  return NextResponse.json({ month, project_id: projectId ?? null, rows });
}
