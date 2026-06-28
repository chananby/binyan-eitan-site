/**
 * schedule-state — pure helpers for the weekly worker-schedule feature.
 *
 * The `schedule_assignments` table holds one row per (worker, date)
 * tuple where "worker" is one of:
 *   • a real staff member (staff_id set, temp_name null)
 *   • a temporary day-laborer / "פועל יומי" (staff_id null, temp_name
 *     set — same dual-key pattern as board_assignments.worker_id /
 *     worker_name on the live board)
 *
 * The DB CHECK guarantees exactly one of those two sides is non-null,
 * and a partial UNIQUE(staff_id, date) WHERE staff_id IS NOT NULL keeps
 * a real staff member to one site per day. For temp workers there's no
 * unique constraint at the DB level — two distinct day-laborers can
 * share a name (intentional, same as the live board). The application
 * enforces "one row per (temp_name, date)" via DELETE-then-INSERT in
 * the POST handler.
 *
 * This module is the pure side: build a 5-day week range, fold the
 * server payload into a fast lookup map, read a single cell, list the
 * temp workers that surface in a given week, and generate the row set
 * for the "apply this site to the whole week" convenience.
 *
 * Pure JS. No DB, no I/O.
 */

import { addWeeks, WEEK_DAYS } from "./israel-week";

/** One row of schedule_assignments as returned by the API. Exactly one
 *  of staff_id / temp_name is set; exactly one of project_id /
 *  project_name is set when status='site' (the only status this PR
 *  cares about — special states land in a later PR). */
export interface ScheduleAssignment {
  id: string;
  staff_id: string | null;
  temp_name: string | null;
  date: string;                       // YYYY-MM-DD (local)
  project_id: string | null;
  project_name: string | null;        // free-text manual project
  updated_at?: string;
}

/** A single planned-cell value — what to render in a (worker, day) cell. */
export interface ScheduleCell {
  assignmentId: string;
  projectId: string | null;
  projectName: string | null;
}

/** Identifier for a project target. Exactly one field is set. */
export type ProjectRef =
  | { kind: "real";   id: string }
  | { kind: "manual"; name: string };

/** Identifier for a worker — registered staff or a free-text temporary
 *  day-laborer. Same discrimination as ProjectRef so the per-cell
 *  upsert path stays symmetric on both sides. */
export type WorkerKey =
  | { kind: "staff"; id: string }
  | { kind: "temp";  name: string };

/** Encoded string form used as a Map key in groupBySchedule — a single
 *  scalar means the per-day lookup is a flat Map.get instead of a
 *  nested switch on .kind. */
export function workerKeyString(k: WorkerKey): string {
  return k.kind === "staff" ? "staff:" + k.id : "temp:" + k.name;
}

/** Pick the right WorkerKey out of a row. Throws when both sides are
 *  null — that shouldn't happen per the DB CHECK, but be loud about it
 *  if a corrupt row ever slips through. */
export function workerKeyFromRow(row: ScheduleAssignment): WorkerKey {
  if (row.staff_id) return { kind: "staff", id: row.staff_id };
  if (row.temp_name) return { kind: "temp", name: row.temp_name };
  throw new Error("schedule row has neither staff_id nor temp_name");
}

/** Return the 5 dates of the Israeli construction work week (Sun–Thu)
 *  beginning at `sundayISO`. */
export function weekRange(sundayISO: string): string[] {
  const out: string[] = [];
  const base = new Date(sundayISO + "T12:00:00");
  for (let i = 0; i < WEEK_DAYS; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    out.push(d.toLocaleDateString("sv-SE"));
  }
  return out;
}

/** Fold the API payload into a 2-level map for O(1) cell lookup keyed
 *  by the encoded WorkerKey + date. Works for both staff and temp
 *  rows in one pass; consumers ask for cells via cellAt with a
 *  WorkerKey discriminant. */
export function groupBySchedule(
  rows: ScheduleAssignment[],
): Map<string, Map<string, ScheduleCell>> {
  const byWorker = new Map<string, Map<string, ScheduleCell>>();
  for (const r of rows) {
    let key: string;
    try { key = workerKeyString(workerKeyFromRow(r)); }
    catch { continue; }  // skip corrupt rows rather than throw at the grouper
    let byDate = byWorker.get(key);
    if (!byDate) {
      byDate = new Map();
      byWorker.set(key, byDate);
    }
    byDate.set(r.date, {
      assignmentId: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
    });
  }
  return byWorker;
}

/** Read a single cell. Accepts a WorkerKey discriminant so callers
 *  don't have to encode/decode the string form themselves. */
export function cellAt(
  grouped: ReadonlyMap<string, ReadonlyMap<string, ScheduleCell>>,
  worker: WorkerKey,
  date: string,
): ScheduleCell | null {
  return grouped.get(workerKeyString(worker))?.get(date) ?? null;
}

/** Encoded scalar form of a project target — used as a Map key in the
 *  inverse "by-site" grouping. Same prefix-discrimination idea as
 *  workerKeyString so a real project and a manual project that share
 *  a literal id/name can never collide. */
export function projectKeyString(p: ProjectRef): string {
  return p.kind === "real" ? "project:" + p.id : "manual:" + p.name;
}

/** Pick the project side off a row. Returns null when neither side is
 *  set — shouldn't happen per the DB CHECK for site rows, but be
 *  defensive (e.g., future status='off' rows that PR 6 will add). */
export function projectKeyFromRow(row: ScheduleAssignment): string | null {
  if (row.project_id)   return "project:" + row.project_id;
  if (row.project_name) return "manual:"  + row.project_name;
  return null;
}

/** Fold the same schedule payload into a 2-level map for the inverse
 *  "by-site" view: project → date → list of workers assigned there
 *  that day. Mirrors groupBySchedule's shape but flips the axes.
 *  Rows without a project (defensive — shouldn't exist per CHECK)
 *  are skipped, as are rows without a resolvable worker. */
export function groupByProjectDate(
  rows: ScheduleAssignment[],
): Map<string, Map<string, WorkerKey[]>> {
  const out = new Map<string, Map<string, WorkerKey[]>>();
  for (const r of rows) {
    const pkey = projectKeyFromRow(r);
    if (!pkey) continue;
    let wkey: WorkerKey;
    try { wkey = workerKeyFromRow(r); }
    catch { continue; }
    let byDate = out.get(pkey);
    if (!byDate) {
      byDate = new Map();
      out.set(pkey, byDate);
    }
    let list = byDate.get(r.date);
    if (!list) {
      list = [];
      byDate.set(r.date, list);
    }
    list.push(wkey);
  }
  return out;
}

/** Read the list of workers planned at a project on a date. Empty
 *  array when nothing is planned — caller renders an em-dash. */
export function cellWorkers(
  grouped: ReadonlyMap<string, ReadonlyMap<string, ReadonlyArray<WorkerKey>>>,
  project: ProjectRef,
  date: string,
): ReadonlyArray<WorkerKey> {
  return grouped.get(projectKeyString(project))?.get(date) ?? [];
}

/** Names of every temp worker who has at least one assignment in the
 *  given rows. Sorted alphabetically; deduped. Used by the table to
 *  render the "פועלים יומיים" section without an explicit registry —
 *  a temp worker EXISTS in the world only by having a row, the same
 *  way manual workers exist in board_assignments.
 *
 *  Implication for "empty temp worker" UX: a temp can't be added to
 *  the table without committing at least one (date, site) to the
 *  database. The Add-temp form requires day+project for exactly this
 *  reason — once submitted, the temp appears here on the next reload
 *  and survives refresh by virtue of being in DB. */
export function distinctTempWorkers(rows: ScheduleAssignment[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.temp_name) set.add(r.temp_name);
  }
  return [...set].sort();
}

/** Build a single upsert-shaped row for (worker, date, project).
 *  Exactly one of staff_id / temp_name is non-null; exactly one of
 *  project_id / project_name is non-null. Both the per-cell POST flow
 *  and the "apply to whole week" batch call this so the row shape
 *  can't drift apart. */
export function buildAssignmentRow(
  worker: WorkerKey,
  date: string,
  project: ProjectRef,
): {
  staff_id:     string | null;
  temp_name:    string | null;
  date:         string;
  project_id:   string | null;
  project_name: string | null;
} {
  return {
    staff_id:     worker.kind === "staff" ? worker.id   : null,
    temp_name:    worker.kind === "temp"  ? worker.name : null,
    date,
    project_id:   project.kind === "real"   ? project.id   : null,
    project_name: project.kind === "manual" ? project.name : null,
  };
}

/** Minimal worker shape that isUnassignedWorkday needs. Matches the
 *  GET payload's staff row plus the role check — kept as a local type
 *  so callers don't have to import a heavier UI WorkerRef. */
export interface WorkerForUnassignedCheck {
  id: string;
  role?: string | null;
}

/** True when `worker` is a regular field worker (role==='עובד') who
 *  has no schedule row for `date` AND is not on vacation that day.
 *  This is the "should be on a site but isn't" signal the by-worker
 *  table uses to surface gaps the admin still needs to fill.
 *
 *  Returns false for:
 *    • foremen (role==='ממונה') and managers — they don't need a daily
 *      site assignment; their absence from a cell is not a gap.
 *    • temp workers — they have no role; they exist in the schedule
 *      only because someone placed them. An "absent" temp isn't a
 *      planning gap, it's just the default state.
 *    • workers on vacation that day — the legitimate-absence case.
 *    • workers who DO have a schedule row for that date.
 *
 *  The vacationKeys set is the same `staff_id|date` set built once at
 *  the table level — passing the prebuilt set keeps this O(1) per
 *  call instead of re-scanning the vacation list. */
export function isUnassignedWorkday(
  worker: WorkerForUnassignedCheck,
  date: string,
  grouped: ReadonlyMap<string, ReadonlyMap<string, ScheduleCell>>,
  vacationKeys: ReadonlySet<string>,
): boolean {
  if (worker.role !== "עובד") return false;
  if (vacationKeys.has(worker.id + "|" + date)) return false;
  if (cellAt(grouped, { kind: "staff", id: worker.id }, date) !== null) return false;
  return true;
}

/** Row payloads for "apply this site to every day of the week". */
export function applyToAllWeek(
  worker: WorkerKey,
  project: ProjectRef,
  weekDates: string[],
): Array<ReturnType<typeof buildAssignmentRow>> {
  return weekDates.map((date) => buildAssignmentRow(worker, date, project));
}
