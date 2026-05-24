/**
 * Worker-history aggregation — "display, don't judge".
 *
 * Builds a day-by-day timeline for a SINGLE worker over a date range.
 * Marks each day as present / vacation / missing / no-exit. There is
 * deliberately no concept of "late" or "early" — the feature surfaces
 * the raw signals and lets the admin spot patterns themselves.
 *
 * Saturdays are skipped from the output entirely (not flagged as missing).
 * Other non-work days (Friday afternoons, holidays) are not handled —
 * the data model doesn't carry that info yet.
 *
 * This module intentionally lives apart from src/lib/payroll-aggregate.ts:
 *   - payroll-aggregate counts a day only when there's an entry record
 *   - payroll-aggregate rounds hours once across the whole month
 *   - the worker-history view shows every calendar day in the range,
 *     including partial / missing ones, and rounds per day for display
 *
 * Don't merge the two without explicit review — payroll is money-critical.
 */

import {
  workDate,
  israelYMD,
  israelTimeHHMM,
  isEntry,
  isExit,
  dayOfWeekUTC,
  dayNameHE,
} from "./attendance-time";

export interface WorkerHistoryRecord {
  staff_id: string;
  action: string;
  clock_at: string | null;
  created_at: string;
  status?: string | null;
  project?: { id: string; name: string } | null;
}

export interface WorkerVacationDay {
  /** YYYY-MM-DD */
  date: string;
  half_day: boolean;
}

/** Per-day status:
 *  - present:  has both an entry and an exit
 *  - vacation: covered by vacation_days (admin-approved)
 *  - missing:  workday with no attendance and no vacation
 *  - no-exit:  has attendance but the entry/exit pair is incomplete
 *              (either entry without exit, or — much rarer — exit
 *              without entry; both indicate "incomplete day")
 */
export type DayStatus = "present" | "vacation" | "missing" | "no-exit";

export interface WorkerHistoryDay {
  /** YYYY-MM-DD */
  date: string;
  /** Hebrew day name (ראשון, שני, …; "שבת" never appears — skipped) */
  dayName: string;
  /** "HH:MM" first entry of the day in Israel TZ, or null */
  startTime: string | null;
  /** "HH:MM" last exit of the day in Israel TZ, or null */
  endTime: string | null;
  /** Decimal hours (e.g. 8.5), null when entry/exit is incomplete */
  hours: number | null;
  status: DayStatus;
  /** Most-mentioned project name on this day, or null */
  project: string | null;
  /** Only set when status === "vacation" — true for half-day vacations */
  halfDayVacation?: boolean;
  /** True if the day has any attendance row still in status="pending" — i.e.
   *  an unresolved correction request the admin should know about. Independent
   *  of `status`; can layer on top of present / no-exit. */
  hasPending?: boolean;
}

interface DayBucket {
  entries: Date[];
  exits: Date[];
  projects: string[];
  hasPending: boolean;
}

/**
 * Build the day-by-day timeline.
 * @param records      attendance rows for a single worker (any extras are ignored by date filter)
 * @param vacationDays vacation entries for the same worker
 * @param from         inclusive YYYY-MM-DD
 * @param to           inclusive YYYY-MM-DD
 */
export function aggregateWorkerHistory(
  records: WorkerHistoryRecord[],
  vacationDays: WorkerVacationDay[],
  from: string,
  to: string,
): WorkerHistoryDay[] {
  // 1. Bucket attendance records by Israel-local YMD. Records outside the
  //    range are dropped — callers may pass a widened query for TZ safety.
  const byDay = new Map<string, DayBucket>();
  for (const rec of records) {
    const d = workDate(rec);
    const ymd = israelYMD(d);
    if (ymd < from || ymd > to) continue;
    if (!byDay.has(ymd)) byDay.set(ymd, { entries: [], exits: [], projects: [], hasPending: false });
    const bucket = byDay.get(ymd)!;
    if (isEntry(rec.action)) bucket.entries.push(d);
    else if (isExit(rec.action)) bucket.exits.push(d);
    if (rec.status === "pending") bucket.hasPending = true;
    const projName = rec.project?.name;
    if (projName) bucket.projects.push(projName);
  }

  // 2. Vacation lookup: date → half_day. Vacation wins over presence —
  //    the rare case of "vacation day with surprise attendance" is left
  //    as "vacation" for now; refine when it actually shows up in data.
  const vacationByDate = new Map<string, boolean>();
  for (const v of vacationDays) {
    if (v.date >= from && v.date <= to) vacationByDate.set(v.date, v.half_day);
  }

  // 3. Walk every calendar day in the range. Skip Saturdays (not a work
  //    day in this context). Build the row for each remaining day.
  const out: WorkerHistoryDay[] = [];
  for (const ymd of iterDaysInclusive(from, to)) {
    if (dayOfWeekUTC(ymd) === 6) continue; // Saturday
    const dayName = dayNameHE(ymd);

    // Vacation: takes precedence over attendance.
    const vacationHalf = vacationByDate.get(ymd);
    if (vacationHalf !== undefined) {
      out.push({
        date: ymd, dayName,
        startTime: null, endTime: null, hours: null,
        status: "vacation", project: null,
        halfDayVacation: vacationHalf,
      });
      continue;
    }

    const bucket = byDay.get(ymd);
    if (!bucket || (bucket.entries.length === 0 && bucket.exits.length === 0)) {
      out.push({
        date: ymd, dayName,
        startTime: null, endTime: null, hours: null,
        status: "missing", project: null,
      });
      continue;
    }

    const firstEntry = bucket.entries.length
      ? new Date(Math.min(...bucket.entries.map(e => e.getTime())))
      : null;
    const lastExit = bucket.exits.length
      ? new Date(Math.max(...bucket.exits.map(e => e.getTime())))
      : null;

    const startTime = firstEntry ? israelTimeHHMM(firstEntry) : null;
    const endTime   = lastExit   ? israelTimeHHMM(lastExit)   : null;

    let hours: number | null = null;
    if (firstEntry && lastExit) {
      const ms = lastExit.getTime() - firstEntry.getTime();
      if (ms > 0) hours = Math.round(ms / 36_000) / 100;
    }

    // Most-mentioned project for the day; ties broken arbitrarily.
    const projectCount: Record<string, number> = {};
    for (const p of bucket.projects) projectCount[p] = (projectCount[p] ?? 0) + 1;
    const project = Object.entries(projectCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const status: DayStatus = firstEntry && lastExit ? "present" : "no-exit";

    out.push({
      date: ymd, dayName, startTime, endTime, hours, status, project,
      ...(bucket.hasPending ? { hasPending: true } : {}),
    });
  }
  // Newest first — UI shows recent days at the top of the table.
  return out.reverse();
}

/** Yield "YYYY-MM-DD" for each calendar day in [from, to] inclusive.
 *  Anchored at UTC noon to dodge DST seams when stepping by +1 day. */
function* iterDaysInclusive(from: string, to: string): Generator<string> {
  let d = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (d.getTime() <= end.getTime()) {
    yield d.toISOString().slice(0, 10);
    d = new Date(d.getTime() + 86_400_000);
  }
}
