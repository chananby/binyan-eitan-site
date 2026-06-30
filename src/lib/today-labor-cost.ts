// Today's labor-cost estimate for the admin dashboard ("עלויות היום").
//
// Covers EVERY worker who attended today — not only those still on
// site. The previous shape counted the latest row per staff_id and
// kept only those whose latest row was a clock-in, which dropped 75%
// of the day's actual cost because most workers finish their shift
// and clock out before the contractor opens the dashboard.
//
// Per-worker rule (approach C: actual hours with a safety cap):
//
//   employment_type='daily'  or daily_rate > 0  → full daily_rate.
//   employment_type='global' or only monthly_global_salary set
//                                                → monthly_global_salary / 22.
//   employment_type='hourly' or only hourly_rate set
//                                                → actualHours × hourly_rate,
//                                                  where actualHours pairs
//                                                  every clock-in with its
//                                                  matching clock-out (or
//                                                  with `now` for the open
//                                                  segment of a worker who
//                                                  hasn't clocked out yet).
//                                                  Capped at 8.5h once the
//                                                  raw sum crosses 10h — at
//                                                  that point a forgotten
//                                                  clock-out is more likely
//                                                  than a 12-hour shift.
//
// Pure JS — no DB, no I/O — so the rollup is trivially testable and a
// single bad row can never poison the dashboard.

export interface LaborWorker {
  /** 'hourly' | 'daily' | 'global'. Treated as the primary signal; the
   *  rates below are fallbacks if it's missing or unrecognised. */
  employment_type?: string | null;
  daily_rate?: number | string | null;
  hourly_rate?: number | string | null;
  monthly_global_salary?: number | string | null;
}

export interface LaborEvent {
  /** "כניסה" / "in" / "יציאה" / "out". */
  action?: string | null;
  /** Canonical work timestamp. Preferred. */
  clock_at?: string | null;
  created_at?: string | null;
  /** Legacy column kept for back-compat. */
  recorded_at?: string | null;
}

/** One entry per worker who attended today — events carries ALL of
 *  that worker's attendance rows for the day, in any order. */
export interface WorkerLaborInput {
  worker?: LaborWorker;
  events: ReadonlyArray<LaborEvent>;
}

/** Standard work day used when the actual-hours signal looks
 *  unreliable (raw sum > HOURS_CAP). */
const STANDARD_HOURS = 8.5;
const HOURS_CAP = 10;
/** Working days per month — kept in sync with payroll-forecast.ts so
 *  the dashboard and the monthly forecast agree on what "a month" is. */
const WORK_DAYS_PER_MONTH = 22;

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function eventTime(e: LaborEvent): number {
  const s = e.clock_at ?? e.recorded_at ?? e.created_at ?? null;
  if (!s) return NaN;
  return new Date(s).getTime();
}

function isInAction(action: string | null | undefined): boolean {
  return action === "כניסה" || action === "in";
}
function isOutAction(action: string | null | undefined): boolean {
  return action === "יציאה" || action === "out";
}

/** Walk the worker's events chronologically, pair every clock-in with
 *  its clock-out, and return the total hours worked. The final segment
 *  is closed against `now` if no out arrived. NaN-safe — unparseable
 *  events drop out before the walk. */
export function hoursWorkedFromEvents(
  events: ReadonlyArray<LaborEvent>,
  now: number,
): number {
  const sorted = events
    .map(e => ({ ev: e, t: eventTime(e) }))
    .filter(x => Number.isFinite(x.t))
    .sort((a, b) => a.t - b.t);

  let totalMs = 0;
  let openSince: number | null = null;
  for (const { ev, t } of sorted) {
    if (isInAction(ev.action)) {
      // A second "in" without a "out" between is a repeat / glitch;
      // keep the existing openSince so we don't lose the earlier
      // start time.
      if (openSince === null) openSince = t;
    } else if (isOutAction(ev.action)) {
      if (openSince !== null) {
        const delta = t - openSince;
        if (delta > 0) totalMs += delta;
        openSince = null;
      }
      // Orphan "out" (no prior open in) is ignored.
    }
  }
  // Worker still clocked in — close against now.
  if (openSince !== null && now > openSince) {
    totalMs += now - openSince;
  }
  return totalMs / 3_600_000;
}

export function computeTodayLaborCost(
  workers: ReadonlyArray<WorkerLaborInput>,
  now: number,
): number {
  let total = 0;
  for (const { worker, events } of workers) {
    if (!worker) continue;
    if (events.length === 0) continue;

    const empType = (worker.employment_type ?? "").toLowerCase();
    const daily   = num(worker.daily_rate);
    const hourly  = num(worker.hourly_rate);
    const monthly = num(worker.monthly_global_salary);

    let contribution = 0;

    if (empType === "daily" && daily > 0) {
      contribution = daily;
    } else if (empType === "global" && monthly > 0) {
      contribution = monthly / WORK_DAYS_PER_MONTH;
    } else if (empType === "hourly" && hourly > 0) {
      contribution = costForHourly(events, hourly, now);
    } else {
      // employment_type missing / unrecognised — fall back to which
      // rate is actually populated, in the same priority order the
      // payroll route would pay against: daily > hourly > global.
      if (daily > 0)        contribution = daily;
      else if (hourly > 0)  contribution = costForHourly(events, hourly, now);
      else if (monthly > 0) contribution = monthly / WORK_DAYS_PER_MONTH;
    }

    if (Number.isFinite(contribution) && contribution > 0) {
      total += contribution;
    }
  }
  return total;
}

function costForHourly(
  events: ReadonlyArray<LaborEvent>,
  hourlyRate: number,
  now: number,
): number {
  const rawHours = hoursWorkedFromEvents(events, now);
  if (!Number.isFinite(rawHours) || rawHours <= 0) return 0;
  // Safety cap: any worker whose raw hours cross HOURS_CAP probably
  // forgot to clock out. Fall back to a standard workday so the
  // dashboard doesn't inflate from one stale row.
  const hours = rawHours > HOURS_CAP ? STANDARD_HOURS : rawHours;
  return hours * hourlyRate;
}
