/**
 * /api/admin/schedule/day — single-day projection of the weekly schedule.
 *
 *   GET ?date=YYYY-MM-DD — defaults to todayLocal() (Israel TZ) when
 *                         missing. Returns:
 *     { date, schedule, workers, projects, manual_projects, vacations }
 *
 * Why a sibling to the existing GET /api/admin/schedule (which already
 * accepts ?week=…): the unified live-board work projects the schedule
 * onto a single day, not a five-day window. Reusing the same payload
 * shape — just narrowed — lets BoardTab swap in cleanly under PR β
 * without learning a week-based shape it doesn't need.
 *
 * Implementation mirrors GET /api/admin/schedule 1:1: same five parallel
 * SELECTs, same column sets, same role/status filters on staff and
 * projects. The only differences are the date filters on
 * schedule_assignments and vacation_days, which become an `eq(date)`
 * instead of `gte/lte` bounding a range.
 *
 * Admin only. service_role; RLS on with no policies (same posture as
 * the rest of /api/admin/schedule).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { todayLocal } from "../../../../../lib/israel-week";

export const runtime = "nodejs";

const SCHEDULE_COLUMNS =
  "id, staff_id, temp_name, date, project_id, project_name, status, note, updated_at";

function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // No ?date= → today in Israel local time (NOT the server's UTC date —
  // see todayLocal's comment for the bug class this prevents).
  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ?? todayLocal();
  if (!isISODate(date)) {
    return NextResponse.json(
      { error: "date parameter must be YYYY-MM-DD when provided" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Five queries in parallel — identical shape to the weekly GET so the
  // BoardTab refactor in PR β can reuse the same payload type. status +
  // note are included in SCHEDULE_COLUMNS here (the weekly GET still
  // doesn't surface them; the unified board will).
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
      .eq("date", date),
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
      .eq("date", date),
  ]);

  if (scheduleRes.error) {
    console.error("[admin/schedule/day GET] schedule:", scheduleRes.error.message);
    return NextResponse.json({ error: scheduleRes.error.message }, { status: 500 });
  }
  if (workersRes.error) {
    console.error("[admin/schedule/day GET] workers:", workersRes.error.message);
    return NextResponse.json({ error: workersRes.error.message }, { status: 500 });
  }
  if (projectsRes.error) {
    console.error("[admin/schedule/day GET] projects:", projectsRes.error.message);
    return NextResponse.json({ error: projectsRes.error.message }, { status: 500 });
  }
  if (manualProjectsRes.error) {
    console.error("[admin/schedule/day GET] manual_projects:", manualProjectsRes.error.message);
    return NextResponse.json({ error: manualProjectsRes.error.message }, { status: 500 });
  }
  if (vacationsRes.error) {
    console.error("[admin/schedule/day GET] vacations:", vacationsRes.error.message);
    return NextResponse.json({ error: vacationsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    date,
    schedule:        scheduleRes.data        ?? [],
    workers:         workersRes.data         ?? [],
    projects:        projectsRes.data        ?? [],
    manual_projects: manualProjectsRes.data  ?? [],
    vacations:       vacationsRes.data       ?? [],
  });
}
