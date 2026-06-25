/**
 * /api/admin/schedule/apply-week — quick fill / clear an entire week
 * for a single worker in one round-trip.
 *
 *   POST   — apply: fill every non-vacation day of the week with the
 *            given project. Vacation days (vacation_days table) are
 *            skipped so the schedule never silently overwrites a
 *            day-off mark.
 *
 *   DELETE — clear: drop every schedule row for the worker in the
 *            given week. (vacation_days untouched — that's a payroll
 *            artefact owned by a different surface.)
 *
 * Body shapes:
 *   POST   { staff_id | temp_name, week_start, project_id | project_name }
 *   DELETE { staff_id | temp_name, week_start }
 *
 * Why a separate endpoint and not array-overload on /api/admin/schedule
 * POST: the per-cell endpoint takes one (worker, date, project)
 * tuple — overloading it with an "actually it's a whole week, also
 * skip vacation days, also clear-on-empty" mode buries semantics that
 * are obviously bigger than one cell. Two endpoints, one job each.
 *
 * Atomicity: we use two queries per call (DELETE 5 dates + INSERT N
 * dates) instead of 5×2 round-trips. The partial UNIQUE on
 * (staff_id, date) means we can't .upsert; the bulk-delete +
 * bulk-insert pattern matches the per-cell DELETE-then-INSERT shape
 * from /api/admin/schedule, just scaled to a whole week.
 *
 * Admin only. service_role.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { weekRange, applyToAllWeek, type WorkerKey } from "../../../../../lib/schedule-state";
import { resolveActorLabel } from "../../../../../lib/audit-actor";

export const runtime = "nodejs";

const SCHEDULE_COLUMNS =
  "id, staff_id, temp_name, date, project_id, project_name, updated_at";

type WorkerSide =
  | { kind: "staff"; id:   string }
  | { kind: "temp";  name: string };

function parseWorkerSide(body: { staff_id?: unknown; temp_name?: unknown }):
  | { worker: WorkerSide }
  | { error: string }
{
  const sId = typeof body.staff_id  === "string" ? body.staff_id.trim()  : "";
  const tNm = typeof body.temp_name === "string" ? body.temp_name.trim() : "";
  if (sId && tNm)   return { error: "send staff_id OR temp_name, not both" };
  if (!sId && !tNm) return { error: "staff_id or temp_name required" };
  if (sId) return { worker: { kind: "staff", id:   sId } };
  return         { worker: { kind: "temp",  name: tNm } };
}

function isDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Look up the worker's vacation_days inside `dates`. Returns the set
 *  of YYYY-MM-DD strings that should be skipped on insert. Only real
 *  staff have vacation rows — temps have no vacation concept (they
 *  exist only by being scheduled, no payroll trail to honour). */
async function vacationDatesFor(
  supabase: ReturnType<typeof createServerClient>,
  worker: WorkerSide,
  dates: string[],
): Promise<Set<string>> {
  if (worker.kind !== "staff") return new Set();
  const { data, error } = await supabase
    .from("vacation_days")
    .select("date")
    .eq("staff_id", worker.id)
    .in("date", dates);
  if (error) {
    // Soft-fail: if the lookup breaks, fall through to "no vacation"
    // rather than blocking the whole apply. The admin can re-run.
    console.warn("[apply-week vacation lookup]", JSON.stringify(error));
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.date as string));
}

/** Drop every row matching (worker, dates IN week) in one round-trip.
 *  Shared by POST (the "replace before insert" step) and DELETE (the
 *  whole job on its own). */
async function clearWeek(
  supabase: ReturnType<typeof createServerClient>,
  worker: WorkerSide,
  dates: string[],
): Promise<{ error: string | null }> {
  let q = supabase
    .from("schedule_assignments")
    .delete()
    .in("date", dates);
  if (worker.kind === "staff") q = q.eq("staff_id",  worker.id);
  else                         q = q.eq("temp_name", worker.name);
  const { error } = await q;
  return { error: error?.message ?? null };
}

// ── POST — apply a single project to every non-vacation day of the week ────
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { staff_id?: string; temp_name?: string; week_start?: string; project_id?: string; project_name?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const w = parseWorkerSide(body);
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: 400 });

  if (!isDate(body.week_start)) return NextResponse.json({ error: "week_start required (YYYY-MM-DD, Sunday)" }, { status: 400 });
  const dates = weekRange(body.week_start);

  const hasId   = typeof body.project_id   === "string" && body.project_id.trim().length   > 0;
  const hasName = typeof body.project_name === "string" && body.project_name.trim().length > 0;
  if (hasId && hasName)    return NextResponse.json({ error: "send project_id OR project_name, not both" }, { status: 400 });
  if (!hasId && !hasName)  return NextResponse.json({ error: "project_id or project_name required" }, { status: 400 });

  const supabase = createServerClient();

  // 1. Vacation days in range — we skip them on insert (the vacation
  //    badge wins over the schedule cell visually anyway, but writing
  //    a schedule row on a vacation day would surface as a confusing
  //    leftover when the admin lifts the vacation).
  const vacationSet = await vacationDatesFor(supabase, w.worker, dates);

  // 2. Wipe the slate for the whole week — one query.
  const clr = await clearWeek(supabase, w.worker, dates);
  if (clr.error) {
    console.error("[apply-week POST — clear]", clr.error);
    return NextResponse.json({ error: clr.error }, { status: 500 });
  }

  // 3. Build the insert rows via the pure helper (single source of
  //    truth for the shape, shared with the per-cell POST). Filter
  //    out vacation dates.
  const project = hasId
    ? { kind: "real",   id:   body.project_id!.trim() }   as const
    : { kind: "manual", name: body.project_name!.trim() } as const;
  const workerKey: WorkerKey = w.worker.kind === "staff"
    ? { kind: "staff", id:   w.worker.id }
    : { kind: "temp",  name: w.worker.name };

  const insertableDates = dates.filter((d) => !vacationSet.has(d));
  if (insertableDates.length === 0) {
    return NextResponse.json({ assignments: [], skipped_vacation: [...vacationSet] });
  }

  const created_by = await resolveActorLabel(supabase, req);
  const updated_at = new Date().toISOString();
  const rows = applyToAllWeek(workerKey, project, insertableDates).map((r) => ({
    ...r,
    created_by,
    updated_at,
  }));

  const { data, error } = await supabase
    .from("schedule_assignments")
    .insert(rows)
    .select(SCHEDULE_COLUMNS);

  if (error) {
    console.error("[apply-week POST — insert]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    assignments: data ?? [],
    skipped_vacation: [...vacationSet],
  });
}

// ── DELETE — clear every schedule row for the worker in the week ───────────
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { staff_id?: string; temp_name?: string; week_start?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const w = parseWorkerSide(body);
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: 400 });
  if (!isDate(body.week_start)) return NextResponse.json({ error: "week_start required (YYYY-MM-DD, Sunday)" }, { status: 400 });
  const dates = weekRange(body.week_start);

  const supabase = createServerClient();
  const clr = await clearWeek(supabase, w.worker, dates);
  if (clr.error) {
    console.error("[apply-week DELETE]", clr.error);
    return NextResponse.json({ error: clr.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
