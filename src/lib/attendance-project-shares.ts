/**
 * Attendance → per-project share aggregator, used by the salary-doc
 * auto-split suggestion. Pure JS, no DB, no I/O.
 *
 * Model: one worker's attendance rows over a calendar month are grouped
 * by day. Each day contributes `firstIn → lastOut` hours to the "most-
 * mentioned project of the day" — the same day→project rule the monthly
 * report uses, so an admin who reads both surfaces sees the same
 * attribution. Days with hours but no project (project_id null on every
 * row) drop to an "unassigned" bucket the caller can surface separately.
 *
 * We split *by hours* rather than by day-count for two reasons: it's the
 * more faithful signal when a worker's day is split across projects
 * (hourly workers) and it collapses cleanly to day-count for the
 * global-salary case (a 8h global-owner day contributes 8h — same
 * proportional weight as 1 day). No employment_type branching in this
 * helper; the caller applies the split to whatever total (gross salary
 * in ILS) it's dividing.
 */

import { workDate, israelYMD, isEntry, isExit } from "./attendance-time";

export interface AttendanceProjectRow {
  action: string;
  clock_at: string | null;
  created_at: string;
  project_id: string | null;
}

export interface ProjectShare {
  project_id: string;
  hours: number;
}

export interface AttendanceProjectShares {
  /** Distinct projects with > 0 hours in the month. Sorted by hours desc. */
  shares: ProjectShare[];
  /** Sum of hours across all projects (excluding unassigned). */
  totalHours: number;
  /** Hours the worker clocked with NO project_id on any row that day —
   *  the caller decides whether to warn or ignore. Not part of shares. */
  unassignedHours: number;
}

interface DayBucket {
  entries: Date[];
  exits: Date[];
  projectVotes: Record<string, number>;
}

/** Aggregate one worker's month of attendance into per-project hours.
 *  monthPrefix is "YYYY-MM"; rows outside are silently skipped so the
 *  caller can widen its query safely (TZ edges). */
export function computeAttendanceProjectShares(
  records: ReadonlyArray<AttendanceProjectRow>,
  monthPrefix: string,
): AttendanceProjectShares {
  const byDay = new Map<string, DayBucket>();
  for (const rec of records) {
    if (rec.clock_at == null) continue; // absence markers don't count
    const d = workDate(rec);
    const ymd = israelYMD(d);
    if (!ymd.startsWith(monthPrefix)) continue;

    if (!byDay.has(ymd)) {
      byDay.set(ymd, { entries: [], exits: [], projectVotes: {} });
    }
    const bucket = byDay.get(ymd)!;
    if (isEntry(rec.action))      bucket.entries.push(d);
    else if (isExit(rec.action))  bucket.exits.push(d);
    if (rec.project_id) {
      bucket.projectVotes[rec.project_id] = (bucket.projectVotes[rec.project_id] ?? 0) + 1;
    }
  }

  const hoursByProject: Record<string, number> = {};
  let unassignedHours = 0;

  for (const bucket of byDay.values()) {
    bucket.entries.sort((a, b) => a.getTime() - b.getTime());
    bucket.exits.sort((a, b) => a.getTime() - b.getTime());
    const firstIn = bucket.entries[0];
    const lastOut = bucket.exits[bucket.exits.length - 1];
    if (!firstIn || !lastOut) continue;                 // open shift — skip
    const ms = lastOut.getTime() - firstIn.getTime();
    if (ms <= 0) continue;
    const hours = ms / 3_600_000;

    const winner = Object.entries(bucket.projectVotes)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    if (winner) hoursByProject[winner] = (hoursByProject[winner] ?? 0) + hours;
    else        unassignedHours += hours;
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const shares: ProjectShare[] = Object.entries(hoursByProject)
    .map(([project_id, hours]) => ({ project_id, hours: round2(hours) }))
    .filter((s) => s.hours > 0)
    .sort((a, b) => b.hours - a.hours);
  const totalHours = round2(shares.reduce((s, r) => s + r.hours, 0));

  return { shares, totalHours, unassignedHours: round2(unassignedHours) };
}

/** Turn (shares in hours) + a total ILS amount into split rows in ILS,
 *  rounded to 2 decimals. The largest share absorbs any rounding drift
 *  so the final sum equals docTotal exactly (down to the agora).
 *  Returns [] when shares is empty or totalHours <= 0. */
export function shareHoursToIls(
  shares: ReadonlyArray<ProjectShare>,
  docTotal: number,
): Array<{ project_id: string; amount: number; hours: number }> {
  if (!Number.isFinite(docTotal) || docTotal <= 0) return [];
  const totalHours = shares.reduce((s, r) => s + r.hours, 0);
  if (totalHours <= 0) return [];

  const round2 = (n: number) => Math.round(n * 100) / 100;
  // Assign raw proportional amounts, keep the largest row's index so
  // the residual after rounding all others lands there.
  const draft = shares.map((s) => ({
    project_id: s.project_id,
    hours: s.hours,
    amount: round2((s.hours / totalHours) * docTotal),
  }));
  const assigned = round2(draft.reduce((s, r) => s + r.amount, 0));
  const residual = round2(docTotal - assigned);
  if (residual !== 0 && draft.length > 0) {
    // Largest amount absorbs the residual.
    let maxIdx = 0;
    for (let i = 1; i < draft.length; i++) if (draft[i].amount > draft[maxIdx].amount) maxIdx = i;
    draft[maxIdx].amount = round2(draft[maxIdx].amount + residual);
  }
  return draft.filter((r) => r.amount > 0);
}
