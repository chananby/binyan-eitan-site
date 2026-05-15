import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import {
  isAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";
import { israelDayStartISO } from "../../../../../lib/israel-time";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const isAdmin = getAdminRoleFromRequest(req) === "admin";

  // Use Israel timezone to determine start of today (DST-aware)
  const nowIsrael  = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const todayStr   = nowIsrael.split(" ")[0]; // "YYYY-MM-DD"
  const todayStart = israelDayStartISO(todayStr);

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

  let query = supabase
    .from("attendance")
    .select("id, action, lat, lng, distance_from_project_m, timestamp_label, clock_at, project_id, created_at, staff:staff_id(id, name, phone, role), project:project_id(id, name)")
    .gte("created_at", todayStart)
    .order("created_at", { ascending: false });

  if (projectIds !== null) {
    query = query.in("project_id", projectIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/attendance/today]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data ?? [] });
}
