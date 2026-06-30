/**
 * /api/admin/schedule — weekly worker-schedule (GET + POST + DELETE).
 *
 *   GET ?week=YYYY-MM-DD — Sunday-of-week (Israeli construction week).
 *   Returns: { week, days, schedule[], workers[], projects[],
 *              manual_projects[], vacations[] }
 *
 *   POST — assign (or re-assign) a worker to a site on a given day.
 *     Body must include exactly one worker side AND exactly one
 *     project side:
 *       worker  side:  staff_id    OR  temp_name
 *       project side:  project_id  OR  project_name
 *     Temp workers (פועלים יומיים) mirror board_assignments.worker_name
 *     pattern — the same dual-key model the live board uses.
 *
 *     Strategy: DELETE-then-INSERT keyed on the worker side + date.
 *     The DB UNIQUE on (staff_id, date) is *partial* (WHERE staff_id
 *     IS NOT NULL), so supabase-js's .upsert({onConflict}) can't match
 *     it cleanly (same 42P10 we dodged on board_assignments). The
 *     two-step replace works for both staff and temp and stays
 *     idempotent under refresh-and-resave.
 *
 *   DELETE — clear the cell:
 *     { staff_id, date }  OR  { temp_name, date }
 *
 * Admin only. service_role; RLS-on with no policies (same posture as
 * /api/admin/board-assignments).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";
import { weekRange, buildAssignmentRow } from "../../../../lib/schedule-state";
import { resolveActorLabel } from "../../../../lib/audit-actor";

export const runtime = "nodejs";

const SCHEDULE_COLUMNS =
  "id, staff_id, temp_name, date, project_id, project_name, updated_at";

function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const week = req.nextUrl.searchParams.get("week") ?? "";
  if (!isISODate(week)) {
    return NextResponse.json(
      { error: "week parameter required (YYYY-MM-DD, Sunday of the week)" },
      { status: 400 },
    );
  }

  // 5-day window (Sun..Thu). The DB index on `date` plus this small
  // range make the query a hot path even with thousands of historical
  // rows in the table.
  const days = weekRange(week);
  const firstDay = days[0];
  const lastDay  = days[days.length - 1];

  const supabase = createServerClient();

  // Five queries in parallel — all small, all independent. workers /
  // projects / manual_projects mirror the live board GET 1:1 so the
  // upcoming PR 3 edit dialog can reuse the same column set without
  // re-fetching.
  const [
    scheduleRes,
    workersRes,
    projectsRes,
    manualProjectsRes,
    vacationsRes,
  ] = await Promise.all([
    supabase
      .from("schedule_assignments")
      .select(SCHEDULE_COLUMNS)
      .gte("date", firstDay)
      .lte("date", lastDay)
      .order("date", { ascending: true }),
    supabase
      .from("staff")
      .select("id, name, role, label")
      .eq("active", true)
      .is("deleted_at", null)
      .eq("office_only", false)
      .in("role", ["עובד", "ממונה"])
      .order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id, name, status")
      .eq("status", "active")
      // project_type='site' keeps overhead/meta projects out of the
      // weekly schedule's site picker — they're never destinations
      // for worker placement.
      .eq("project_type", "site")
      .order("name", { ascending: true }),
    supabase
      .from("board_manual_projects")
      .select("id, name, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("vacation_days")
      .select("staff_id, date, half_day")
      .gte("date", firstDay)
      .lte("date", lastDay),
  ]);

  if (scheduleRes.error) {
    console.error("[admin/schedule GET] schedule:", scheduleRes.error.message);
    return NextResponse.json({ error: scheduleRes.error.message }, { status: 500 });
  }
  if (workersRes.error) {
    console.error("[admin/schedule GET] workers:", workersRes.error.message);
    return NextResponse.json({ error: workersRes.error.message }, { status: 500 });
  }
  if (projectsRes.error) {
    console.error("[admin/schedule GET] projects:", projectsRes.error.message);
    return NextResponse.json({ error: projectsRes.error.message }, { status: 500 });
  }
  if (manualProjectsRes.error) {
    console.error("[admin/schedule GET] manual_projects:", manualProjectsRes.error.message);
    return NextResponse.json({ error: manualProjectsRes.error.message }, { status: 500 });
  }
  if (vacationsRes.error) {
    console.error("[admin/schedule GET] vacations:", vacationsRes.error.message);
    return NextResponse.json({ error: vacationsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    week,
    days,
    schedule:        scheduleRes.data        ?? [],
    workers:         workersRes.data         ?? [],
    projects:        projectsRes.data        ?? [],
    manual_projects: manualProjectsRes.data  ?? [],
    vacations:       vacationsRes.data       ?? [],
  });
}

// ── Body parser shared by POST + DELETE ────────────────────────────────────
//
// Validates: exactly one worker side (staff_id OR temp_name), valid
// date, and (for POST) exactly one project side. Returns either the
// parsed pieces or an error response ready to send.
type WorkerSide =
  | { kind: "staff"; id:   string }
  | { kind: "temp";  name: string };

function parseWorkerSide(body: { staff_id?: unknown; temp_name?: unknown }):
  | { worker: WorkerSide }
  | { error: string }
{
  const sId  = typeof body.staff_id  === "string" ? body.staff_id.trim()  : "";
  const tNm  = typeof body.temp_name === "string" ? body.temp_name.trim() : "";
  if (sId && tNm) return { error: "send staff_id OR temp_name, not both" };
  if (!sId && !tNm) return { error: "staff_id or temp_name required" };
  if (sId) return { worker: { kind: "staff", id:   sId } };
  return         { worker: { kind: "temp",  name: tNm } };
}

function isDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ── POST — assign / re-assign a single cell ────────────────────────────────
//
// DELETE-then-INSERT keyed on (worker side, date). The partial UNIQUE
// in DB (`UNIQUE(staff_id, date) WHERE staff_id IS NOT NULL`) doesn't
// match a clean `onConflict` target, and there's NO unique index on
// temp_name at all (deliberate — two day-laborers can share a name,
// same as the live board's worker_name). The two-step replace handles
// both shapes uniformly: drop any existing row for (worker, date)
// then insert the new one.
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { staff_id?: string; temp_name?: string; date?: string; project_id?: string; project_name?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Worker side
  const w = parseWorkerSide(body);
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: 400 });

  // Date
  if (!isDate(body.date)) return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
  const date = body.date;

  // Project side
  const hasId   = typeof body.project_id   === "string" && body.project_id.trim().length   > 0;
  const hasName = typeof body.project_name === "string" && body.project_name.trim().length > 0;
  if (hasId && hasName)    return NextResponse.json({ error: "send project_id OR project_name, not both" }, { status: 400 });
  if (!hasId && !hasName)  return NextResponse.json({ error: "project_id or project_name required" }, { status: 400 });

  const row = buildAssignmentRow(
    w.worker.kind === "staff" ? { kind: "staff", id:   w.worker.id   }
                              : { kind: "temp",  name: w.worker.name },
    date,
    hasId
      ? { kind: "real",   id:   body.project_id!.trim() }
      : { kind: "manual", name: body.project_name!.trim() },
  );

  const supabase = createServerClient();

  // 1. Drop any prior row for this (worker, date). For staff: matches
  //    the partial UNIQUE so at most one row to remove. For temp: the
  //    application-level invariant we enforce — no DB constraint
  //    backs it, but our DELETE-by-(temp_name,date) keeps the
  //    invariant intact even under racing tabs (last write wins).
  let delQuery = supabase
    .from("schedule_assignments")
    .delete()
    .eq("date", date);
  if (w.worker.kind === "staff") delQuery = delQuery.eq("staff_id", w.worker.id);
  else                           delQuery = delQuery.eq("temp_name", w.worker.name);
  const { error: delErr } = await delQuery;
  if (delErr) {
    console.error("[admin/schedule POST — drop prior]", JSON.stringify(delErr));
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // 2. Insert the new row.
  const created_by = await resolveActorLabel(supabase, req);
  const updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("schedule_assignments")
    .insert({ ...row, created_by, updated_at })
    .select(SCHEDULE_COLUMNS)
    .single();

  if (error) {
    console.error("[admin/schedule POST — insert]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ assignment: data });
}

// ── DELETE — clear a cell ("no assignment") ────────────────────────────────
//
// Body: { staff_id, date } OR { temp_name, date }. Composite-key drop;
// missing row → 200 (the desired state is what the caller wanted, and
// the click that triggered this might race with a sibling tab's
// clear).
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { staff_id?: string; temp_name?: string; date?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const w = parseWorkerSide(body);
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: 400 });
  if (!isDate(body.date)) return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
  const date = body.date;

  const supabase = createServerClient();
  let delQuery = supabase
    .from("schedule_assignments")
    .delete()
    .eq("date", date);
  if (w.worker.kind === "staff") delQuery = delQuery.eq("staff_id", w.worker.id);
  else                           delQuery = delQuery.eq("temp_name", w.worker.name);
  const { error } = await delQuery;

  if (error) {
    console.error("[admin/schedule DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
