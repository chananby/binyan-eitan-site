/**
 * Forward-looking payroll forecast — rough estimate of what one full work
 * month would cost in salary.
 *
 * Unlike the historical payroll report (which multiplies real attendance
 * by the per-month rate), this module multiplies a theoretical "full
 * month" — 22 working days, 8.5 hours per day — by each worker's current
 * rate. The result is a planning number, not a payroll number: it does
 * NOT account for vacation, sick days, holidays, partial months, or any
 * worker who happens to be on leave.
 *
 * Pure functions only — no DB, no I/O. The API route at
 * /api/admin/payroll/forecast assembles the inputs (active staff list +
 * per-worker rates via getRatesForMonth) and passes them in. Kept this
 * way so the math is trivially testable and easy to lift into a SaaS
 * tenancy later.
 */

export const WORK_DAYS_PER_MONTH = 22;
export const WORK_HOURS_PER_DAY = 8.5;
// 22 × 8.5 = 187 — included as an export so callers and the UI tooltip
// don't have to multiply at every render site.
export const WORK_HOURS_PER_MONTH = WORK_DAYS_PER_MONTH * WORK_HOURS_PER_DAY;

export interface ForecastRates {
  hourly_rate: number | null;
  daily_rate: number | null;
  monthly_global_salary: number | null;
}

export interface ForecastWorker {
  id: string;
  employment_type: string;
}

export interface ForecastBreakdown {
  total: number;
  per_type: { hourly: number; daily: number; global: number };
  count: number;
  missing_rate_count: number;
}

/**
 * Forecast a single worker's gross salary for a full theoretical month.
 *
 * Returns 0 (not null, not NaN) for:
 *   - rates === null (worker has no rate row at all)
 *   - the relevant rate field for this employment_type is null/0
 *   - employment_type is something other than hourly/daily/global
 *
 * Returning 0 keeps the running sum well-behaved; the "missing rate"
 * signal is surfaced separately by forecastTotal() via missing_rate_count
 * so the UI can flag it.
 */
export function forecastWorker(
  employment_type: string,
  rates: ForecastRates | null,
): number {
  if (!rates) return 0;
  if (employment_type === "global") {
    return Number(rates.monthly_global_salary ?? 0) || 0;
  }
  if (employment_type === "daily") {
    return (Number(rates.daily_rate ?? 0) || 0) * WORK_DAYS_PER_MONTH;
  }
  if (employment_type === "hourly") {
    return (Number(rates.hourly_rate ?? 0) || 0) * WORK_HOURS_PER_MONTH;
  }
  return 0;
}

/** Worker is "missing a rate" iff the field that matters for their
 *  employment_type is absent (null) or zero. Unknown employment_type is
 *  not flagged — mirrors hasValidRate() in staff-rates.ts. */
function hasUsableRate(employment_type: string, rates: ForecastRates | null): boolean {
  if (!rates) return false;
  if (employment_type === "hourly") return (Number(rates.hourly_rate) || 0) > 0;
  if (employment_type === "daily")  return (Number(rates.daily_rate)  || 0) > 0;
  if (employment_type === "global") return (Number(rates.monthly_global_salary) || 0) > 0;
  return true;
}

/**
 * Aggregate forecast across a list of workers.
 *
 * `ratesFor(workerId)` is a function the caller supplies — typically a
 * `Map.get` wrapped to also consult the legacy staff columns when no
 * staff_rates row exists for the month. Keeping the lookup as a callback
 * is what lets this module stay pure and DB-free.
 */
export function forecastTotal<W extends ForecastWorker>(
  workers: W[],
  ratesFor: (workerId: string) => ForecastRates | null,
): ForecastBreakdown {
  let total = 0;
  let hourly = 0, daily = 0, global = 0;
  let missing = 0;

  for (const w of workers) {
    const rates = ratesFor(w.id);
    const amt = forecastWorker(w.employment_type, rates);
    total += amt;
    if (w.employment_type === "hourly")      hourly += amt;
    else if (w.employment_type === "daily")  daily  += amt;
    else if (w.employment_type === "global") global += amt;
    if (!hasUsableRate(w.employment_type, rates)) missing++;
  }

  return {
    total,
    per_type: { hourly, daily, global },
    count: workers.length,
    missing_rate_count: missing,
  };
}
