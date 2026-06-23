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
  /** Short free-text marker (e.g. "רתך", "זמני") displayed as a badge
   *  on the worker chip. NULL → no badge. */
  label?: string | null;
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
/**
 * Manual project columns to render on the board: the union of names
 * the admin has explicitly added (rows in `board_manual_projects`) +
 * any name that still appears inside a `manual:` projectKey from the
 * assignments map (back-compat for assignments that pre-date the
 * persistent-column table). Real-project name collisions are dropped
 * so we never render a manual twin next to a real project.
 *
 * Returns the human names, sorted alphabetically — the encoded
 * "manual:<name>" key is BoardTab's concern, kept out of the pure
 * helper.
 */
export interface ManualProjectRef {
  id: string;
  name: string;
}

/**
 * Normalise a project name for collision detection — mirrors the SQL
 * `LOWER(TRIM(name))` semantics on the unique index, plus an internal-
 * whitespace collapse so "bayit  vegan" and "bayit vegan" map the same.
 * Used only for comparison; the human display name is preserved.
 *
 * Without this, "Bayit Vegan" (real) + "bayit vegan" (manual) would
 * render as twin columns instead of being deduped to the real one.
 */
function normName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export function mergeManualProjectNames(
  manualProjectsTable: ManualProjectRef[],
  groupedKeys: Iterable<string>,
  realProjects: ProjectRef[],
): string[] {
  const realNorm = new Set(realProjects.map((p) => normName(p.name)));
  // Track normalised forms to dedupe across sources too — two manual
  // rows with the same name in different cases share one column.
  const seenNorm = new Set<string>();
  const out: string[] = [];
  const tryAdd = (name: string) => {
    const n = normName(name);
    if (!n || realNorm.has(n) || seenNorm.has(n)) return;
    seenNorm.add(n);
    out.push(name);
  };
  for (const mp of manualProjectsTable) tryAdd(mp.name);
  for (const k of groupedKeys) {
    if (!k.startsWith("manual:")) continue;
    tryAdd(k.slice(7));
  }
  return out.sort();
}

export function unassignedWorkers(allWorkers: WorkerRef[], assignments: BoardAssignment[]): WorkerRef[] {
  const assigned = new Set<string>();
  for (const a of assignments) {
    if (a.worker_id) assigned.add(a.worker_id);
  }
  return allWorkers.filter((w) => !assigned.has(w.id));
}

// ── Optimistic mutations ─────────────────────────────────────────────────
//
// applyMoveOptimistic translates a "card was dropped on a column" event
// into a fresh assignments list — without hitting the server — so the UI
// can repaint immediately and the network round-trip becomes a quiet
// reconciliation. Pure (state in, state out).
//
// Encoded ids match BoardTab.tsx so the same encoding lives in one
// place. A real worker card carries `worker:<staffId>`; a manual card
// carries `manual_card:<assignmentId>`. Targets are
// "project:<id>" / "manual:<name>" / UNASSIGNED_TARGET.

export const UNASSIGNED_TARGET = "__unassigned__";

export interface MoveCard {
  /** Stable card id encoded by the UI. */
  id: string;
  /** True for manual cards (no worker_id, only worker_name). */
  isManual: boolean;
  /** Display label — only used to rebuild a manual row on move. */
  label: string;
  /** The board_assignments.id when known (manual cards on the board). */
  assignmentId?: string | null;
}

/** Returns a new list with the drag applied, or null if the move can't
 *  be predicted locally (caller falls back to a server refetch). */
export function applyMoveOptimistic(
  assignments: BoardAssignment[],
  card: MoveCard,
  targetId: string,
): BoardAssignment[] | null {
  // Manual card: identify the row by assignmentId; mutate its project
  // side; or remove on unassign.
  if (card.isManual && card.assignmentId) {
    const idx = assignments.findIndex((a) => a.id === card.assignmentId);
    if (idx === -1) return null;
    const next = [...assignments];
    if (targetId === UNASSIGNED_TARGET) {
      next.splice(idx, 1); return next;
    }
    const row = { ...next[idx] };
    if (targetId.startsWith("project:")) { row.project_id = targetId.slice(8); row.project_name = null; }
    else if (targetId.startsWith("manual:")) { row.project_id = null; row.project_name = targetId.slice(7); }
    else return null;
    next[idx] = row;
    return next;
  }

  // Real worker card: drop any existing row for this worker (1-worker→
  // 1-site is enforced server-side), then push the new placement (or
  // none, if heading to the pool).
  if (card.id.startsWith("worker:")) {
    const workerId = card.id.slice(7);
    const filtered = assignments.filter((a) => a.worker_id !== workerId);
    if (targetId === UNASSIGNED_TARGET) return filtered;
    if (targetId.startsWith("project:")) {
      return [...filtered, { id: "optimistic-" + workerId, worker_id: workerId, worker_name: null, project_id: targetId.slice(8), project_name: null }];
    }
    if (targetId.startsWith("manual:")) {
      return [...filtered, { id: "optimistic-" + workerId, worker_id: workerId, worker_name: null, project_id: null, project_name: targetId.slice(7) }];
    }
  }
  return null;
}
