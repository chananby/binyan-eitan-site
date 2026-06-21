/**
 * GET /api/admin/payroll/forecast?month=YYYY-MM
 *
 * Returns a rough forecast of total monthly salary cost for a theoretical
 * full work month (22 days × 8.5 hours). NOT a payroll report — actual
 * attendance is ignored. The math lives in src/lib/payroll-forecast.ts;
 * this route does the DB plumbing and shape conversion only.
 *
 * Same staff filter as /api/admin/payroll (role IN עובד/ממונה, active=true,
 * deleted_at IS NULL), and the same rate lookup (staff_rates with a
 * fallback to the legacy staff columns), so the forecast number tracks
 * the historical report when set to the same month.
 *
 * Response:
 *   {
 *     month: "YYYY-MM",
 *     total: number,
 *     per_type: { hourly, daily, global },
 *     count: number,
 *     missing_rate_count: number,
 *     per_worker: Array<{
 *       id, name, employment_type, rate, monthly_forecast, missing_rate
 *     }>   // sorted DESC by monthly_forecast — most expensive first
 *   }
 *
 * Admin only. Month query param is optional — defaults to the current
 * Israel-time month so a Dashboard load returns "this month's forecast"
 * without the client having to compute the date.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { getRatesForMonth } from "../../../../../lib/staff-rates";
import { forecastTotal, type ForecastRates } from "../../../../../lib/payroll-forecast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function currentIsraelMonth(): string {
  // sv-SE locale yields YYYY-MM-DD without padding surprises; slice keeps YYYY-MM.
  return new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" }).slice(0, 7);
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month");
  const month = monthParam ?? currentIsraelMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month query param invalid (YYYY-MM)" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Same filter the historical payroll route uses — anyone the company
  // pays. Admins/manager role excluded. Legacy rate columns travel along
  // for the fallback path below. `name` powers the per-worker breakdown
  // in the response (the dashboard dialog renders it as the row label).
  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .select("id, name, employment_type, hourly_rate, daily_rate, monthly_global_salary")
    .eq("active", true)
    .is("deleted_at", null)
    .in("role", ["עובד", "ממונה"]);

  if (staffErr) {
    console.error("[payroll/forecast] staff err:", staffErr.message);
    return NextResponse.json({ error: staffErr.message }, { status: 500 });
  }
  const workers = (staff ?? []) as Array<{
    id: string; name: string; employment_type: string;
    hourly_rate: number | null; daily_rate: number | null; monthly_global_salary: number | null;
  }>;

  if (workers.length === 0) {
    return NextResponse.json({
      month, total: 0, per_type: { hourly: 0, daily: 0, global: 0 },
      count: 0, missing_rate_count: 0, per_worker: [],
    });
  }

  // Per-month rates — same lookup as payroll. Workers absent from the
  // map fall back to their legacy staff.* columns; this mirrors the
  // payroll route's behaviour so the two numbers stay reconcilable.
  const ratesMap = await getRatesForMonth(supabase, workers.map((w) => w.id), month);
  const legacyById = new Map(
    workers.map((w) => [w.id, {
      hourly_rate: w.hourly_rate,
      daily_rate: w.daily_rate,
      monthly_global_salary: w.monthly_global_salary,
    } as ForecastRates]),
  );
  const ratesFor = (id: string): ForecastRates | null => {
    const r = ratesMap.get(id);
    if (r) return { hourly_rate: r.hourly_rate, daily_rate: r.daily_rate, monthly_global_salary: r.monthly_global_salary };
    return legacyById.get(id) ?? null;
  };

  const breakdown = forecastTotal(workers, ratesFor);

  // Flatten the per-worker lines from generics to plain JSON the client
  // consumes. `worker.name` survives because the input row carried it.
  const per_worker = breakdown.per_worker.map((line) => ({
    id: line.worker.id,
    name: line.worker.name,
    employment_type: line.worker.employment_type,
    rate: line.rate,
    monthly_forecast: line.monthly_forecast,
    missing_rate: line.missing_rate,
  }));

  return NextResponse.json({
    month,
    total: breakdown.total,
    per_type: breakdown.per_type,
    count: breakdown.count,
    missing_rate_count: breakdown.missing_rate_count,
    per_worker,
  });
}
