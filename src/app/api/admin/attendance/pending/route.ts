import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import {
  isAuthedFromRequest,
  getRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// GET — manual attendance pending approval.
// Admin: sees all. Foreman: scoped to projects where foreman_id = their staff id.
export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const role = getRoleFromRequest(req);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("attendance")
    .select("id, action, timestamp_label, clock_at, created_at, is_manual, status, lat, lng, distance_from_project_m, staff:staff_id(id, name, phone), project:project_id(id, name)")
    .eq("status", "pending")
    .eq("is_manual", true)
    .order("created_at", { ascending: false });

  if (role === "foreman") {
    const staffId = getForemanStaffIdFromRequest(req);
    if (!staffId) return NextResponse.json({ records: [] });
    const { data: myProjects, error: pErr } = await supabase
      .from("projects")
      .select("id")
      .eq("foreman_id", staffId);
    if (pErr) {
      console.error("[admin/attendance/pending foreman-projects]", JSON.stringify(pErr));
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    const ids = (myProjects ?? []).map((p) => p.id);
    if (ids.length === 0) return NextResponse.json({ records: [] });
    query = query.in("project_id", ids);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/attendance/pending]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data ?? [] });
}
