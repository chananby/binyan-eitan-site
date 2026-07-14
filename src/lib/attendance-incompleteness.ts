/**
 * Attendance incompleteness engine — the single source of truth for "what's
 * missing / damaged" across the attendance data. One pure function turns the
 * raw records into a flat list of actionable issues; the endpoint
 * (/api/admin/attendance/incomplete) fetches the data and calls it, and every
 * consumer (payroll gate, dashboard panel) reads only from here.
 *
 * Scope decision (locked with chnn): a day is incomplete ONLY when a record is
 * damaged — NOT by cross-referencing the schedule, and NOT for empty days.
 *
 * Six issue types:
 *   • no_exit            past day: an entry with no exit (forgot to clock out)
 *   • no_entry           past day: an exit with no entry (orphan exit)
 *   • no_project         an entry with project_id = null (unassigned shift)
 *   • stuck_failure      a worker_stuck row in attendance_failures (blocked)
 *   • pending_correction a worker correction request awaiting review
 *   • pending_manual     a manual attendance row awaiting approval
 *
 * De-dup: stale-opens (the /stale-opens endpoint) is the SAME thing as no_exit,
 * just a recent-window view — this engine is the one place that computes it, so
 * a day is never counted twice. A single day CAN carry several issues (e.g. a
 * worker who got stuck AND has a no_exit); each is its own item, and the day
 * count de-dups on (staff_id, date).
 *
 * No logic is duplicated from worker-history-aggregate / monthly-attendance-
 * report: those build a full per-day TIMELINE (present / vacation / missing /
 * …) — a different job. This engine reuses the same low-level primitives
 * (isEntry / isExit / workDate / israelYMD) and the same no_exit / no_entry
 * rules, so the two-vocabulary handling ("in"/"כניסה", "out"/"יציאה") has a
 * single origin.
 */

import { isEntry, isExit, workDate, israelYMD } from "./attendance-time";

export type IncompleteIssue =
  | "no_exit"
  | "no_entry"
  | "no_project"
  | "stuck_failure"
  | "pending_correction"
  | "pending_manual";

export type IncompleteAction =
  | "complete_exit"
  | "complete_entry"
  | "assign_project"
  | "add_day"
  | "review_correction"
  | "review_manual";

export interface IncompleteItem {
  staff_id: string;
  staff_name: string | null;
  /** Israel-local "YYYY-MM-DD". */
  date: string;
  issue: IncompleteIssue;
  action: IncompleteAction;
  project_id: string | null;
  project_name: string | null;
  /** id of the underlying row (attendance / failure / correction) the fix targets. */
  ref_id: string | null;
}

// ── Flat input rows (the endpoint flattens Supabase joins before calling) ──
export interface EngineAttendanceRow {
  id: string;
  staff_id: string;
  staff_name: string | null;
  action: string;
  clock_at: string | null;
  created_at: string;
  status: string | null;
  is_manual: boolean | null;
  project_id: string | null;
  project_name: string | null;
}
export interface EngineFailureRow {
  id: string;
  staff_id: string;
  staff_name: string | null;
  attempted_at: string;
  project_id: string | null;
  project_name: string | null;
}
export interface EngineCorrectionRow {
  id: string;
  staff_id: string;
  staff_name: string | null;
  clock_at: string | null;
  created_at: string;
  project_id: string | null;
  project_name: string | null;
}

export interface EngineInput {
  attendance: EngineAttendanceRow[];
  failures: EngineFailureRow[];
  pendingCorrections: EngineCorrectionRow[];
}

export interface IncompleteSummary {
  day_count: number;
  by_issue: Record<IncompleteIssue, number>;
}

function todayIsrael(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
}

/**
 * Turn raw attendance / failure / correction data into a flat list of issues.
 * @param opts.todayYmd  override "today" (Israel YMD) for deterministic tests.
 */
export function computeIncompleteDays(
  input: EngineInput,
  opts: { todayYmd?: string } = {},
): IncompleteItem[] {
  const todayYmd = opts.todayYmd ?? todayIsrael();
  const items: IncompleteItem[] = [];

  // ── From attendance rows: no_project + pending_manual (per row), and
  //    group by staff×day for the no_exit / no_entry pairing. ──
  interface DayBucket {
    staff_id: string;
    staff_name: string | null;
    date: string;
    entries: EngineAttendanceRow[];
    exits: EngineAttendanceRow[];
  }
  const days = new Map<string, DayBucket>();

  for (const r of input.attendance) {
    // Absence markers (vacation / sick) carry clock_at = null — not a damaged
    // record, skip them entirely.
    if (!r.clock_at) continue;
    const date = israelYMD(workDate(r));
    const key = `${r.staff_id}|${date}`;
    let b = days.get(key);
    if (!b) {
      b = { staff_id: r.staff_id, staff_name: r.staff_name, date, entries: [], exits: [] };
      days.set(key, b);
    }
    const entry = isEntry(r.action);
    if (entry) b.entries.push(r);
    else if (isExit(r.action)) b.exits.push(r);

    // no_project — an ENTRY with no project assigned. Independent of pairing
    // and applies to any day (incl. today): a project-less shift is always
    // damaged (breaks per-project cost + salary split).
    if (entry && !r.project_id) {
      items.push({
        staff_id: r.staff_id, staff_name: r.staff_name, date,
        issue: "no_project", action: "assign_project",
        project_id: null, project_name: null, ref_id: r.id,
      });
    }
    // pending_manual — a manual row that hasn't been approved yet.
    if (r.status === "pending" && r.is_manual) {
      items.push({
        staff_id: r.staff_id, staff_name: r.staff_name, date,
        issue: "pending_manual", action: "review_manual",
        project_id: r.project_id, project_name: r.project_name, ref_id: r.id,
      });
    }
  }

  // no_exit / no_entry — PAST days only. Today's open entry is an in-progress
  // shift (worker still clocked in), never "no_exit".
  for (const b of days.values()) {
    if (b.date >= todayYmd) continue;
    const hasEntry = b.entries.length > 0;
    const hasExit = b.exits.length > 0;
    if (hasEntry && !hasExit) {
      const first = b.entries[0];
      items.push({
        staff_id: b.staff_id, staff_name: b.staff_name, date: b.date,
        issue: "no_exit", action: "complete_exit",
        project_id: first.project_id, project_name: first.project_name, ref_id: first.id,
      });
    } else if (hasExit && !hasEntry) {
      const first = b.exits[0];
      items.push({
        staff_id: b.staff_id, staff_name: b.staff_name, date: b.date,
        issue: "no_entry", action: "complete_entry",
        project_id: first.project_id, project_name: first.project_name, ref_id: first.id,
      });
    }
  }

  // ── stuck_failure — a blocked clock attempt (no record exists → add_day). ──
  for (const f of input.failures) {
    items.push({
      staff_id: f.staff_id, staff_name: f.staff_name,
      date: israelYMD(new Date(f.attempted_at)),
      issue: "stuck_failure", action: "add_day",
      project_id: f.project_id, project_name: f.project_name, ref_id: f.id,
    });
  }

  // ── pending_correction — a worker request awaiting review. ──
  for (const c of input.pendingCorrections) {
    const base = c.clock_at ?? c.created_at;
    items.push({
      staff_id: c.staff_id, staff_name: c.staff_name,
      date: israelYMD(new Date(base)),
      issue: "pending_correction", action: "review_correction",
      project_id: c.project_id, project_name: c.project_name, ref_id: c.id,
    });
  }

  return items;
}

/** day_count = distinct (staff_id, date); by_issue = count per issue type. */
export function summarizeIncomplete(items: IncompleteItem[]): IncompleteSummary {
  const by_issue: Record<IncompleteIssue, number> = {
    no_exit: 0, no_entry: 0, no_project: 0,
    stuck_failure: 0, pending_correction: 0, pending_manual: 0,
  };
  const days = new Set<string>();
  for (const it of items) {
    by_issue[it.issue] += 1;
    days.add(`${it.staff_id}|${it.date}`);
  }
  return { day_count: days.size, by_issue };
}
