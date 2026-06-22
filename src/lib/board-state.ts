/**
 * board-state — pure helpers for the worker-assignment board.
 *
 * The board has two kinds of "rows" in `board_assignments`:
 *   • a real worker (worker_id FK → staff) on a real project (project_id
 *     FK → projects) — the everyday case.
 *   • a manual row, where either side carries a free-text label
 *     (worker_name / project_name) instead of an FK. Used for one-off
 *     hires or pop-up sites that don't deserve a permanent record.
 *
 * The DB CHECK constraint guarantees that each side has *exactly one*
 * of (id, name); these helpers all assume that invariant and choose
 * the right field to render or compare against.
 *
 * Pure JS only. No DB, no I/O. The board API route and the upcoming
 * BoardTab UI both consume this module so the "what counts as the
 * same worker / project / column" rule lives in one place.
 */

export interface BoardAssignment {
  id: string;
  worker_id: string | null;
  worker_name: string | null;
  project_id: string | null;
  project_name: string | null;
  updated_at?: string;
}

export interface WorkerRef {
  id: string;
  name: string;
  role?: string | null;
}

export interface ProjectRef {
  id: string;
  name: string;
  status?: string | null;
}

/**
 * Display label for the worker side of an assignment. Returns the FK
 * worker's name if the id is set and the lookup succeeds; otherwise
 * the manual `worker_name` field; otherwise the literal "—" so a
 * malformed row still renders something rather than crashing.
 */
export function workerLabel(a: BoardAssignment, workersById?: ReadonlyMap<string, WorkerRef>): string {
  if (a.worker_id && workersById) {
    const w = workersById.get(a.worker_id);
    if (w) return w.name;
  }
  return a.worker_name ?? "—";
}

/**
 * Display label for the project side of an assignment. Same fallback
 * chain as workerLabel — FK first, free-text second, "—" last.
 */
export function projectLabel(a: BoardAssignment, projectsById?: ReadonlyMap<string, ProjectRef>): string {
  if (a.project_id && projectsById) {
    const p = projectsById.get(a.project_id);
    if (p) return p.name;
  }
  return a.project_name ?? "—";
}

/**
 * Stable key for grouping assignments into board columns. Real
 * projects key on their FK id (so renaming the project moves the
 * column visually but keeps the same DOM column). Manual project
 * entries key on `manual:<name>` so two assignments with the same
 * free-text site name land in one column. Rows with neither side
 * filled (shouldn't exist per the DB CHECK, but be defensive) key on
 * "__none__".
 */
export function projectKey(a: BoardAssignment): string {
  if (a.project_id) return a.project_id;
  if (a.project_name) return `manual:${a.project_name}`;
  return "__none__";
}

/**
 * Group assignments into columns keyed by projectKey. Insertion order
 * within each column matches input order — typically the caller has
 * already sorted by updated_at or worker name; we preserve that so
 * a single source of truth governs row order.
 */
export function groupByProject(assignments: BoardAssignment[]): Map<string, BoardAssignment[]> {
  const out = new Map<string, BoardAssignment[]>();
  for (const a of assignments) {
    const key = projectKey(a);
    const bucket = out.get(key);
    if (bucket) bucket.push(a);
    else out.set(key, [a]);
  }
  return out;
}

/**
 * Workers (real staff rows) who don't yet appear in the assignments
 * list — i.e. the "Unassigned" column on the board. Manual worker
 * rows are NOT considered: by definition they exist only inside the
 * board, so they're never "missing" from staff.
 *
 * Preserves the input order of `allWorkers` — the caller sorts to
 * its preferred order (typically by name).
 */
export function unassignedWorkers(allWorkers: WorkerRef[], assignments: BoardAssignment[]): WorkerRef[] {
  const assigned = new Set<string>();
  for (const a of assignments) {
    if (a.worker_id) assigned.add(a.worker_id);
  }
  return allWorkers.filter((w) => !assigned.has(w.id));
}
