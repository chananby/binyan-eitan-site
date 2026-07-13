/**
 * GET /api/admin/payroll?month=YYYY-MM&staff_id=...
 *
 * Returns a per-active-staff payroll row for the given month.
 *
 * Each row:
 *   { staff_id, name, national_id, is_freelancer, employment_type,
 *     days_worked, hours_worked,
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
 * staff_id (optional) narrows both the staff list and the attendance scan
 * to a single worker — drives the admin's per-worker drilldown view.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";
import { israelDayStartISO } from "../../../../lib/israel-time";
import {
  aggregateAttendance,
  aggregateVacation,
  computeGross,
  type AttendanceRec,
  type VacationRec,
} from "../../../../lib/payroll-aggregate";
import { getRatesForMonth } from "../../../../lib/staff-rates";
import { includeInReport } from "../../../../lib/payroll-include";
import { filterApprovedForPay, countPendingStatus } from "../../../../lib/payroll-attendance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StaffRow {
  id: string;
  name: string;
  national_id: string | null;
  is_freelancer: boolean;
  employment_type: string;
  hourly_rate: number | null;
  daily_rate: number | null;
  monthly_global_salary: number | null;
  travel_allowance: boolean;
  pension_status: string | null;
  holiday_eligible: boolean;
  active: boolean;
  deleted_at?: string | null;
}

type AttendanceRow = AttendanceRec & { project_id: string | null };
type VacationRow   = VacationRec   & { date: string };

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  // Per-worker drilldown (admin-only) — when set, the staff query is
  // narrowed to a single id. Replaces the older project_id filter, which
  // the UI no longer exposes.
  const staffId = searchParams.get("staff_id");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month query param required (YYYY-MM)" }, { status: 400 });
  }

  const monthStart = `${month}-01`;
  const [yStr, mStr] = month.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const supabase = createServerClient();

  // Fetch payable "עובד" + "ממונה" staff (admins/manager roles excluded).
  // NOT filtered by active=true: a worker deactivated after working a month
  // still earned that month's payslip. We fetch active AND inactive here,
  // then include an inactive worker in the report ONLY if they clocked hours
  // this month (includeInReport, below) — so the ~21 dormant inactive rows
  // don't flood the report. deleted_at IS NULL still excludes truly-deleted
  // workers (deleted_at is set only on already-inactive rows).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let staffQuery: any = supabase
    .from("staff")
    .select("id, name, national_id, is_freelancer, employment_type, hourly_rate, daily_rate, monthly_global_salary, travel_allowance, pension_status, holiday_eligible, role, active, deleted_at")
    .is("deleted_at", null)
    .in("role", ["עובד", "ממונה"])
    .order("name", { ascending: true });
  if (staffId) staffQuery = staffQuery.eq("id", staffId);
  const { data: staffData, error: staffErr } = await staffQuery;
  if (staffErr) {
    console.error("[payroll] staff err:", staffErr.message);
    return NextResponse.json({ error: staffErr.message }, { status: 500 });
  }
  const staff = (staffData ?? []) as (StaffRow & { role: string })[];
  if (staff.length === 0) {
    return NextResponse.json({ month, rows: [] });
  }

  // Attendance — filter by the WORK timestamp (clock_at), not the INSERT
  // timestamp (created_at). Prior to this fix the range was on created_at,
  // which silently dropped every retroactively-inserted row (manual
  // backfills for a past month done after that month closed) from payroll
  // — 32 such rows were live in the production DB, contributing zero to
  // the paycheck of the workers they belonged to.
  // clock_at IS NULL rows are absence markers (vacation / sick) that live
  // in vacation_days and don't earn hours; excluding them from payroll's
  // attendance feed is intentional.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Fetch the month's non-deleted rows WITH status, then gate in JS:
  // filterApprovedForPay feeds the aggregation, countPendingStatus feeds the
  // warning. Only status='approved' is paid — the admin's approval is a real
  // gate. Verified safe: every live web / phone-call / clock-out row is
  // written 'approved' (column default), so nothing legitimate is dropped —
  // only pending (awaiting review) and rejected. One query serves both.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let attQuery: any = supabase
    .from("attendance")
    .select("staff_id, action, clock_at, created_at, project_id, status")
    .is("deleted_at", null)
    .gte("clock_at", israelDayStartISO(monthStart))
    .lt("clock_at", israelDayStartISO(nextMonth));
  if (staffId) attQuery = attQuery.eq("staff_id", staffId);
  const { data: attRaw, error: attErr } = await attQuery;
  if (attErr) {
    console.error("[payroll] attendance err:", attErr.message);
    return NextResponse.json({ error: attErr.message }, { status: 500 });
  }
  const attData = filterApprovedForPay((attRaw ?? []) as (AttendanceRow & { status?: string | null })[]);
  const pendingCount = countPendingStatus((attRaw ?? []) as { status?: string | null }[]);

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

  const attStats = aggregateAttendance(attData as AttendanceRow[], month);
  const vacStats = aggregateVacation((vacData ?? []) as VacationRow[]);

  // Rates for the report month from staff_rates (per-month history). Each
  // worker's row in the response reports which source it used so the UI can
  // ⚠️-flag fallback cases.
  const ratesMap = await getRatesForMonth(supabase, staff.map((s) => s.id), month);

  // Presence-driven inclusion: active workers always; inactive only if they
  // have attendance rows this month (attStats.has → ≥1 non-deleted clock row
  // in the month). Keeps deactivated-but-worked in, dormant-inactive out.
  const rows = staff
    .filter((s) => includeInReport(s.active, attStats.has(s.id)))
    .map((s) => {
    const stats = attStats.get(s.id) ?? { days: 0, hours: 0 };
    const vacation_days = vacStats.get(s.id) ?? 0;
    const rateRow  = ratesMap.get(s.id) ?? null;
    // Fallback: when no staff_rates row applies, fall back to the legacy
    // staff columns. UI marks the row "needs rate setup".
    const effectiveRates = rateRow ?? {
      hourly_rate: s.hourly_rate,
      daily_rate: s.daily_rate,
      monthly_global_salary: s.monthly_global_salary,
    };
    const gross_salary = computeGross(s, effectiveRates, stats);
    return {
      staff_id: s.id,
      name: s.name,
      national_id: s.national_id,
      is_freelancer: s.is_freelancer,
      employment_type: s.employment_type,
      days_worked: stats.days,
      hours_worked: stats.hours,
      hourly_rate: effectiveRates.hourly_rate,
      daily_rate:  effectiveRates.daily_rate,
      monthly_global_salary: effectiveRates.monthly_global_salary,
      rate_source: rateRow ? "staff_rates" : "staff_legacy",
      rate_missing: !rateRow,
      vacation_days,
      holiday_eligible: s.holiday_eligible,
      travel_allowance: s.travel_allowance,
      pension_status: s.pension_status,
      gross_salary,
      active: s.active,
      deleted_at: s.deleted_at ?? null,
    };
  });

  return NextResponse.json({ month, staff_id: staffId ?? null, rows, pendingCount });
}
