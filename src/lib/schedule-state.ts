/**
 * schedule-state — pure helpers for the weekly worker-schedule feature.
 *
 * The `schedule_assignments` table holds one row per (staff_id, date)
 * tuple: "this worker is planned to be at this project (or this manual
 * project name) on this day". UNIQUE(staff_id, date) enforces a single
 * site per worker per day; row-per-day (not range) keeps the model
 * symmetric with `vacation_days` and the live `board_assignments`.
 *
 * This module is the pure side: build a 5-day week range, fold the
 * server payload into a fast lookup map, read a single cell, and
 * generate the row set for the "apply this site to the whole week"
 * convenience. Mirrors the shape of board-state.ts so PR 2's API and
 * PR 3's UI can lean on the same idioms.
 *
 * Pure JS. No DB, no I/O. All date math reuses src/lib/israel-week.
 */

import { addWeeks, WEEK_DAYS } from "./israel-week";

/** One row of schedule_assignments as returned by the API. The
 *  CHECK constraint guarantees exactly one of project_id/project_name
 *  is non-null; consumers should still pattern-match defensively. */
export interface ScheduleAssignment {
  id: string;
  staff_id: string;
  date: string;                       // YYYY-MM-DD (local)
  project_id: string | null;
  project_name: string | null;        // free-text manual project
  updated_at?: string;
}

/** A single planned-cell value — what to render in a (worker, day) cell.
 *  Mirrors the project side of BoardAssignment so SiteCard/MoveToDialog
 *  patterns transfer to PR 3 without translation. */
export interface ScheduleCell {
  assignmentId: string;
  projectId: string | null;
  projectName: string | null;         // null when project_id is set
}

/** Identifier for a project target — used by applyToAllWeek so the
 *  caller passes the same shape as the live board's MoveTarget. Exactly
 *  one field is set: `{id}` for a real project, `{name}` for a manual
 *  free-text site. */
export type ProjectRef =
  | { kind: "real";   id: string }
  | { kind: "manual"; name: string };

/** Return the 5 dates of the Israeli construction work week (Sun–Thu)
 *  beginning at `sundayISO`. Output is YYYY-MM-DD strings in local time,
 *  ascending. Uses addWeeks→ day arithmetic via the shared
 *  israel-week helper so DST edges stay consistent across the app. */
export function weekRange(sundayISO: string): string[] {
  const out: string[] = [];
  // weekDayFromSunday(i) === addWeeks(sundayISO, 0) + i days. Re-using
  // addWeeks with fractional weeks isn't supported, so we do the +i math
  // here once and verify via tests rather than spreading day math.
  const base = new Date(sundayISO + "T12:00:00");
  for (let i = 0; i < WEEK_DAYS; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    out.push(d.toLocaleDateString("sv-SE")); // YYYY-MM-DD, local TZ
  }
  return out;
}

/** Fold the API payload into a 2-level map for O(1) cell lookup:
 *  `byStaff.get(staff_id)?.get(date) → ScheduleCell | undefined`.
 *  Rows whose date falls outside the visible week still get indexed —
 *  pruning is the caller's concern (typically PR 2 GET narrows by
 *  `date IN (...)` so this won't normally surface). */
export function groupBySchedule(
  rows: ScheduleAssignment[],
): Map<string, Map<string, ScheduleCell>> {
  const byStaff = new Map<string, Map<string, ScheduleCell>>();
  for (const r of rows) {
    let byDate = byStaff.get(r.staff_id);
    if (!byDate) {
      byDate = new Map();
      byStaff.set(r.staff_id, byDate);
    }
    byDate.set(r.date, {
      assignmentId: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
    });
  }
  return byStaff;
}

/** Return the cell at (staffId, date) — or null when the worker has
 *  nothing planned that day. Wrapper so consumers don't sprinkle
 *  `?.get(...)?.get(...)` everywhere. */
export function cellAt(
  grouped: ReadonlyMap<string, ReadonlyMap<string, ScheduleCell>>,
  staffId: string,
  date: string,
): ScheduleCell | null {
  return grouped.get(staffId)?.get(date) ?? null;
}

/** Build a single upsert-shaped row for (staff_id, date, project).
 *  Exactly one of project_id / project_name is non-null — the DB CHECK
 *  constraint mirrors that. Used by the per-cell POST flow (PR 3) and
 *  the "apply to whole week" batch (PR 4) so the two call sites can't
 *  drift apart. */
export function buildAssignmentRow(
  staffId: string,
  date: string,
  project: ProjectRef,
): { staff_id: string; date: string; project_id: string | null; project_name: string | null } {
  return {
    staff_id: staffId,
    date,
    project_id:   project.kind === "real"   ? project.id   : null,
    project_name: project.kind === "manual" ? project.name : null,
  };
}

/** Row payloads for "apply this site to every day of the week" — five
 *  POSTs / upserts the API layer can send in one batch. The caller
 *  provides `weekDates` (typically `weekRange(sunday)`); a wrong-length
 *  array would be a programmer error, so we don't recompute it here.
 *
 *  Pure data-shaping: no I/O, no validation against existing rows.
 *  PR 3's edit handler runs an UPSERT per row, relying on the DB's
 *  UNIQUE(staff_id, date) to overwrite any prior cell. */
export function applyToAllWeek(
  staffId: string,
  project: ProjectRef,
  weekDates: string[],
): Array<{
  staff_id: string;
  date: string;
  project_id: string | null;
  project_name: string | null;
}> {
  return weekDates.map((date) => buildAssignmentRow(staffId, date, project));
}
