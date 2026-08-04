import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { fetchAllRows } from "../../../../../lib/supabase-pagination";
import {
  isAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";
import { israelDayStartISO } from "../../../../../lib/israel-time";
import { workDate, israelYMD } from "../../../../../lib/attendance-time";

export const runtime = "nodejs";

// Shift a "YYYY-MM-DD" by N days (UTC-noon anchored to dodge DST seams).
function shiftYMD(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const isAdmin = getAdminRoleFromRequest(req) === "admin";

  // Use Israel timezone to determine "today" (DST-aware).
  const nowIsrael  = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const todayStr   = nowIsrael.split(" ")[0]; // "YYYY-MM-DD"
  // Widen the DB window 3 days back so a row whose *work* day is today but
  // was inserted earlier isn't missed; the authoritative filter is by work
  // time in code below, mirroring /api/admin/attendance/report.
  const windowStart = israelDayStartISO(shiftYMD(todayStr, -3));

  // Foreman: restrict to their assigned projects only
  let projectIds: string[] | null = null;
  if (!isAdmin) {
    const staffId = getForemanStaffIdFromRequest(req);
    if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: foremanProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("foreman_id", staffId);

    projectIds = (foremanProjects ?? []).map((p: { id: string }) => p.id);
    if (projectIds.length === 0) return NextResponse.json({ records: [] });
  }

  // Paginate (shared helper) so a busy day across all workers never truncates
  // at the 1000-row cap. id tiebreaker on created_at → total order → gap-free.
  let data: Array<{ clock_at?: string | null; created_at: string }>;
  try {
    data = await fetchAllRows(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from("attendance")
        .select("id, action, lat, lng, distance_from_project_m, timestamp_label, clock_at, project_id, created_at, source, staff:staff_id(id, name, phone, role, attendance_exempt), project:project_id(id, name)")
        .is("deleted_at", null)
        .gte("created_at", windowStart);
      if (projectIds !== null) q = q.in("project_id", projectIds);
      return q.order("created_at", { ascending: false }).order("id", { ascending: false });
    });
  } catch (e) {
    console.error("[admin/attendance/today]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "fetch failed" }, { status: 500 });
  }

  // Authoritative filter: keep only rows whose WORK day (clock_at, falling
  // back to created_at) is today in Israel time. This is what makes "יומן
  // היום" show today's actual activity rather than every row *inserted*
  // today — manual backfills for other dates carry an old clock_at and are
  // dropped here. Order (created_at desc) is preserved for today's rows.
  const records = (data ?? []).filter((r) => israelYMD(workDate(r)) === todayStr);

  return NextResponse.json({ records });
}
