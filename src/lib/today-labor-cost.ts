// Today's labor-cost estimate for the admin dashboard ("עלויות היום").
//
// Daily-rate workers count their full day; hourly-rate workers count
// (now − clock-in) × rate. Pure JS — no DB, no I/O — so the rollup is
// trivially testable and a single bad row can never poison the dashboard.
//
// NaN-safe by design:
//   • workers without a valid (positive) rate contribute 0
//   • workers without a parseable clock-in timestamp contribute 0
//   • numeric columns that arrive as strings (Supabase numeric) are coerced
// The previous inline version dereferenced `recorded_at` — a field the
// /api/admin/attendance/today endpoint doesn't return — turning every
// hourly worker into NaN and poisoning the rollup to ₪NaN.

export interface LaborWorker {
  daily_rate?: number | string | null;
  hourly_rate?: number | string | null;
}

export interface LaborAttendance {
  /** Canonical work-day timestamp (set on clock-in). Preferred. */
  clock_at?: string | null;
  /** Server-side row creation time — fallback when clock_at is missing. */
  created_at?: string | null;
  /** Legacy column kept here for compatibility with surfaces that still
   *  carry the old name. The endpoint that feeds today's dashboard
   *  does NOT return this field, which is exactly why the dashboard
   *  used to render ₪NaN. */
  recorded_at?: string | null;
}

export interface OnSiteEntry {
  record: LaborAttendance;
  worker?: LaborWorker;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export function computeTodayLaborCost(
  list: ReadonlyArray<OnSiteEntry>,
  now: number,
): number {
  let total = 0;
  for (const { record, worker } of list) {
    if (!worker) continue;
    const daily = num(worker.daily_rate);
    if (daily > 0) {
      total += daily;
      continue;
    }
    const hourly = num(worker.hourly_rate);
    if (hourly <= 0) continue;
    // Prefer clock_at (the canonical work-day timestamp that the today
    // endpoint actually returns); fall back through recorded_at /
    // created_at so callers using older payloads still get a number.
    const startStr = record.clock_at ?? record.recorded_at ?? record.created_at ?? null;
    if (!startStr) continue;
    const startMs = new Date(startStr).getTime();
    if (!Number.isFinite(startMs)) continue;
    const hrs = (now - startMs) / 3_600_000;
    if (!Number.isFinite(hrs) || hrs <= 0) continue;
    total += hrs * hourly;
  }
  return total;
}
