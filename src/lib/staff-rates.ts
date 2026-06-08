/**
 * staff-rates — per-month rate lookup helpers.
 *
 * The single source of truth for *what rate applied for a given worker in
 * a given month* is the staff_rates table (one row per worker per month,
 * effective_month always the 1st). Look up via getRatesForMonth — it
 * returns each worker's most-recent rate row whose effective_month does
 * not exceed the requested month. A January row stays in force through
 * every later month until a newer row supersedes it.
 *
 * Payroll math always goes through this helper. The legacy
 * staff.{hourly_rate,daily_rate,monthly_global_salary} columns remain as
 * a *last-resort fallback* when no staff_rates row exists at all — the
 * callers wrap the lookup result with a `rate_missing` flag so the UI
 * can flag the row for the admin.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export interface RateSet {
  hourly_rate: number | null;
  daily_rate: number | null;
  monthly_global_salary: number | null;
}

export interface StaffRateRow extends RateSet {
  staff_id: string;
  effective_month: string; // "YYYY-MM-DD" (always day=01)
}

/** Convert "YYYY-MM" → "YYYY-MM-01" (first-of-month date string). */
function monthFirstDate(monthYM: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthYM)) {
    throw new Error(`getRatesForMonth: invalid month "${monthYM}" — expected "YYYY-MM"`);
  }
  return `${monthYM}-01`;
}

/**
 * Returns a map staff_id → the rate row that applies for the given month.
 * Workers with no qualifying row are absent from the map; callers decide
 * how to handle them (typically: fall back to staff columns + flag).
 *
 * Implementation: ORDER BY effective_month DESC, then keep the first row
 * seen per staff_id. The (staff_id, effective_month DESC) index makes
 * this scan cheap.
 */
export async function getRatesForMonth(
  supabase: SupabaseLike,
  staffIds: string[],
  monthYM: string,
): Promise<Map<string, StaffRateRow>> {
  const out = new Map<string, StaffRateRow>();
  if (staffIds.length === 0) return out;

  const target = monthFirstDate(monthYM);
  const { data, error } = await supabase
    .from("staff_rates")
    .select("staff_id, effective_month, hourly_rate, daily_rate, monthly_global_salary")
    .in("staff_id", staffIds)
    .lte("effective_month", target)
    .order("effective_month", { ascending: false });

  if (error) {
    console.error("[staff-rates] lookup failed:", JSON.stringify(error));
    return out; // empty map → caller falls back per worker
  }

  for (const row of (data ?? []) as StaffRateRow[]) {
    if (!out.has(row.staff_id)) out.set(row.staff_id, row);
  }
  return out;
}

/**
 * "Does this rate set carry a usable number for the worker's employment type?"
 * Used by the UI ⚠️ flag (worker missing a rate that matters for them).
 * For unknown employment_type values we conservatively return true so we
 * don't accidentally flag every admin/manager.
 */
export function hasValidRate(rates: RateSet | null, employment_type: string): boolean {
  if (!rates) return false;
  if (employment_type === "global") {
    return (Number(rates.monthly_global_salary) || 0) > 0;
  }
  if (employment_type === "daily") {
    return (Number(rates.daily_rate) || 0) > 0;
  }
  if (employment_type === "hourly") {
    return (Number(rates.hourly_rate) || 0) > 0;
  }
  return true;
}
