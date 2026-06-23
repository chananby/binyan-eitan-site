/**
 * /api/admin/board-assignments — worker-assignment board (PR 1/2).
 *
 *   GET — bootstrap payload for the board UI:
 *           { assignments, workers, projects }.
 *         All current rows, all active "paid" staff, all active
 *         projects. Admin only.
 *
 *   PUT — one move on the board. Body discriminated by `action`:
 *
 *     1. Assign / move a real worker (UPSERT, enforces 1-worker→1-site):
 *        { action: "assign", worker_id, project_id?  OR  project_name? }
 *
 *     2. Add a manual worker (free-text label) to a project:
 *        { action: "assign_manual_worker", worker_name,
 *          project_id? OR project_name? }
 *
 *     3. Drop a worker back into "Unassigned":
 *        { action: "unassign", worker_id }                  (real worker)
 *        { action: "unassign_row", id }                     (any row, real or manual)
 *
 *   Returns the affected row(s) so the client can refresh its local
 *   state without a full GET round-trip.
 *
 * Notes:
 *   - projects are filtered by status='active' (NOT a boolean `active`
 *     column — projects has neither `active` nor `deleted_at`).
 *   - service_role; RLS on with no policies (same posture as quotes /
 *     catalog_items).
 *   - The DB enforces:
 *       UNIQUE(worker_id) WHERE worker_id IS NOT NULL  → 1-worker→1-site
 *       CHECK at least one of (worker_id, worker_name) and one of
 *       (project_id, project_name) is set on every row.
 *     We never trust the client past that — but doing the check upstream
 *     gives a friendlier error than the raw 23505/23514.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const ASSIGNMENT_COLUMNS =
  "id, worker_id, worker_name, project_id, project_name, created_at, updated_at";

// ── GET — bootstrap the board ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Four queries in parallel — independent and small. manual_projects
  // is the new "empty column" channel: rows here render as columns on
  // the board even when no worker is assigned, so an admin who just
  // typed "+ הוסף אתר" sees something immediately.
  const [assignmentsRes, workersRes, projectsRes, manualProjectsRes] = await Promise.all([
    supabase
      .from("board_assignments")
      .select(ASSIGNMENT_COLUMNS)
      .order("updated_at", { ascending: false }),
    supabase
      .from("staff")
      .select("id, name, role")
      .eq("active", true)
      .is("deleted_at", null)
      .eq("office_only", false)
      .in("role", ["עובד", "ממונה"]) // kept as defence-in-depth; office_only is the primary gate
      .order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id, name, status")
      .eq("status", "active") // status is a string column ('active' / 'inactive'), not a boolean
      .order("name", { ascending: true }),
    supabase
      .from("board_manual_projects")
      .select("id, name, created_at")
      .order("name", { ascending: true }),
  ]);

  if (assignmentsRes.error) {
    console.error("[admin/board-assignments GET] assignments:", assignmentsRes.error.message);
    return NextResponse.json({ error: assignmentsRes.error.message }, { status: 500 });
  }
  if (workersRes.error) {
    console.error("[admin/board-assignments GET] workers:", workersRes.error.message);
    return NextResponse.json({ error: workersRes.error.message }, { status: 500 });
  }
  if (projectsRes.error) {
    console.error("[admin/board-assignments GET] projects:", projectsRes.error.message);
    return NextResponse.json({ error: projectsRes.error.message }, { status: 500 });
  }
  if (manualProjectsRes.error) {
    console.error("[admin/board-assignments GET] manual_projects:", manualProjectsRes.error.message);
    return NextResponse.json({ error: manualProjectsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    assignments:     assignmentsRes.data ?? [],
    workers:         workersRes.data ?? [],
    projects:        projectsRes.data ?? [],
    manual_projects: manualProjectsRes.data ?? [],
  });
}

// ── PUT — one board move ─────────────────────────────────────────────────────

type AssignBody = {
  action: "assign";
  worker_id: string;
  project_id?: string;
  project_name?: string;
};
type AssignManualBody = {
  action: "assign_manual_worker";
  worker_name: string;
  project_id?: string;
  project_name?: string;
};
type UnassignBody       = { action: "unassign";     worker_id: string };
type UnassignRowBody    = { action: "unassign_row"; id: string };
type Body = AssignBody | AssignManualBody | UnassignBody | UnassignRowBody;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function pickProjectSide(body: { project_id?: unknown; project_name?: unknown }):
  | { project_id: string; project_name: null }
  | { project_id: null;   project_name: string }
  | { error: string }
{
  const hasId   = isNonEmptyString(body.project_id);
  const hasName = isNonEmptyString(body.project_name);
  if (hasId && hasName) return { error: "send project_id OR project_name, not both" };
  if (!hasId && !hasName) return { error: "project_id or project_name is required" };
  if (hasId)   return { project_id: (body.project_id as string).trim(), project_name: null };
  return { project_id: null, project_name: (body.project_name as string).trim() };
}

export async function PUT(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = createServerClient();

  // ── action: assign (real worker → project) ────────────────────────────
  // Replaces any existing row for this worker_id, then inserts the new
  // placement. Same end-state as a single UPSERT but without the
  // ON CONFLICT clause that Postgres 42P10'd on us in production:
  //
  // The UNIQUE index on worker_id is *partial* — `WHERE worker_id IS
  // NOT NULL`, because manual rows carry worker_id=NULL and would
  // otherwise collide on each other. supabase-js's
  // `.upsert({onConflict:'worker_id'})` can't express the WHERE
  // predicate Postgres needs to match the partial index, so it raised
  // 42P10 ("no unique or exclusion constraint matching the ON CONFLICT
  // specification") on every drag.
  //
  // DELETE-then-INSERT enforces the same "one worker = one site"
  // invariant naturally: any prior row for this worker is gone before
  // we add the new one. The partial unique index still backs us up
  // against a rare concurrent-second-admin race (would surface as
  // 23505 and bubble up as an error — acceptable for a small admin
  // tool where the user can just retry).
  if (body.action === "assign") {
    if (!isNonEmptyString(body.worker_id)) {
      return NextResponse.json({ error: "worker_id required" }, { status: 400 });
    }
    const pside = pickProjectSide(body);
    if ("error" in pside) return NextResponse.json({ error: pside.error }, { status: 400 });

    const workerId = body.worker_id.trim();
    const { error: delErr } = await supabase
      .from("board_assignments")
      .delete()
      .eq("worker_id", workerId);
    if (delErr) {
      console.error("[admin/board-assignments PUT assign — delete prior]", JSON.stringify(delErr));
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    const { data, error } = await supabase
      .from("board_assignments")
      .insert({ worker_id: workerId, worker_name: null, ...pside })
      .select(ASSIGNMENT_COLUMNS)
      .single();
    if (error) {
      console.error("[admin/board-assignments PUT assign — insert]", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ assignment: data });
  }

  // ── action: assign_manual_worker (free-text worker label → project) ──
  // No conflict target (worker_id is null), so this always inserts a
  // fresh row. Two manual rows with the same name are intentionally
  // allowed — the admin who typed them probably meant two distinct
  // people who happen to share a name.
  if (body.action === "assign_manual_worker") {
    if (!isNonEmptyString(body.worker_name)) {
      return NextResponse.json({ error: "worker_name required" }, { status: 400 });
    }
    const pside = pickProjectSide(body);
    if ("error" in pside) return NextResponse.json({ error: pside.error }, { status: 400 });

    const { data, error } = await supabase
      .from("board_assignments")
      .insert({ worker_id: null, worker_name: body.worker_name.trim(), ...pside })
      .select(ASSIGNMENT_COLUMNS)
      .single();
    if (error) {
      console.error("[admin/board-assignments PUT assign_manual_worker]", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ assignment: data });
  }

  // ── action: unassign (drag a real worker back to the pool) ────────────
  if (body.action === "unassign") {
    if (!isNonEmptyString(body.worker_id)) {
      return NextResponse.json({ error: "worker_id required" }, { status: 400 });
    }
    const { error } = await supabase
      .from("board_assignments")
      .delete()
      .eq("worker_id", body.worker_id.trim());
    if (error) {
      console.error("[admin/board-assignments PUT unassign]", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // ── action: unassign_row (delete any row by id — covers manual rows) ──
  if (body.action === "unassign_row") {
    if (!isNonEmptyString(body.id)) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const { error } = await supabase
      .from("board_assignments")
      .delete()
      .eq("id", body.id.trim());
    if (error) {
      console.error("[admin/board-assignments PUT unassign_row]", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
