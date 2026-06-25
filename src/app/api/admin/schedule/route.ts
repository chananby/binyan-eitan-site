/**
 * /api/admin/schedule — weekly worker-schedule (PR 2/4: read-only).
 *
 *   GET ?week=YYYY-MM-DD — Sunday-of-week (Israeli construction week,
 *   Sun→Thu, 5 days). Returns everything the table needs to render in
 *   one round-trip:
 *     {
 *       schedule:        schedule_assignments rows for the 5-day window
 *       workers:         the same filtered set as the live board
 *                        (active + role ∈ [עובד, ממונה] + !office_only),
 *                        ordered by name
 *       projects:        active projects (id, name)
 *       manual_projects: persistent free-text site columns
 *       vacations:       vacation_days rows whose date falls in-window
 *                        so the table can render "🌴 חופש" cells
 *     }
 *
 * Admin only. service_role; RLS-on with no policies (same posture as
 * /api/admin/board-assignments).
 *
 * PR 3 will add POST (upsert) + DELETE on this route. PR 1 created the
 * table and the pure helpers (weekRange, groupBySchedule).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";
import { weekRange } from "../../../../lib/schedule-state";

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
