/**
 * /api/admin/schedule — weekly worker-schedule (PR 3/4: GET + POST + DELETE).
 *
 *   GET ?week=YYYY-MM-DD — Sunday-of-week (Israeli construction week,
 *   Sun→Thu, 5 days). Returns everything the table needs to render in
 *   one round-trip:
 *     { week, days[5], schedule[], workers[], projects[],
 *       manual_projects[], vacations[] }
 *
 *   POST — assign (or re-assign) a worker to a site on a given day:
 *     { staff_id, date, project_id }       — real project
 *     { staff_id, date, project_name }     — manual / free-text site
 *     Exactly one of project_id / project_name must be set. The DB
 *     UNIQUE(staff_id, date) lets a single UPSERT replace any prior
 *     cell — that's the on-tap edit path from PR 3's UI.
 *
 *   DELETE — clear the cell ("no assignment"):
 *     { staff_id, date }
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
  "id, staff_id, date, project_id, project_name, updated_at";

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

// ── POST — assign / re-assign a single cell ────────────────────────────────
//
// Single-row UPSERT keyed on UNIQUE(staff_id, date). The constraint is a
// regular full unique (NOT partial like board_assignments.worker_id) so
// supabase-js's .upsert({onConflict:'staff_id,date'}) maps cleanly onto
// it — no 42P10 risk to dodge, no DELETE-then-INSERT fallback needed.
//
// project_id XOR project_name: exactly one must be set. The DB CHECK
// also enforces this; we just hand-validate first for a friendlier 400.
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { staff_id?: string; date?: string; project_id?: string; project_name?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const staffId = typeof body.staff_id === "string" ? body.staff_id.trim() : "";
  const date    = typeof body.date     === "string" ? body.date.trim()     : "";
  const hasId   = typeof body.project_id   === "string" && body.project_id.trim().length   > 0;
  const hasName = typeof body.project_name === "string" && body.project_name.trim().length > 0;

  if (!staffId)                    return NextResponse.json({ error: "staff_id required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
  if (hasId && hasName)            return NextResponse.json({ error: "send project_id OR project_name, not both" }, { status: 400 });
  if (!hasId && !hasName)          return NextResponse.json({ error: "project_id or project_name required" }, { status: 400 });

  const row = buildAssignmentRow(
    staffId,
    date,
    hasId
      ? { kind: "real",   id:   body.project_id!.trim() }
      : { kind: "manual", name: body.project_name!.trim() },
  );

  const supabase = createServerClient();
  const created_by = await resolveActorLabel(supabase, req);
  const updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("schedule_assignments")
    .upsert(
      { ...row, created_by, updated_at },
      { onConflict: "staff_id,date" },
    )
    .select("id, staff_id, date, project_id, project_name, updated_at")
    .single();

  if (error) {
    console.error("[admin/schedule POST]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ assignment: data });
}

// ── DELETE — clear a cell ("no assignment") ────────────────────────────────
//
// Body { staff_id, date } — the same composite key the UNIQUE index
// uses, so we don't need to know the row id. Missing row → 200 (the
// effective state is what the caller wanted), since the click that
// triggered this might race with a sibling tab's clear.
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { staff_id?: string; date?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const staffId = typeof body.staff_id === "string" ? body.staff_id.trim() : "";
  const date    = typeof body.date     === "string" ? body.date.trim()     : "";
  if (!staffId)                          return NextResponse.json({ error: "staff_id required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from("schedule_assignments")
    .delete()
    .eq("staff_id", staffId)
    .eq("date", date);

  if (error) {
    console.error("[admin/schedule DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
