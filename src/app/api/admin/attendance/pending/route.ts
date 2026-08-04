import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { fetchAllRows } from "../../../../../lib/supabase-pagination";
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

  // Foreman scope — resolved ONCE (async) before paging, so we don't re-query
  // projects on every page.
  let foremanProjectIds: string[] | null = null;
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
    foremanProjectIds = ids;
  }

  // Paginate (shared helper) — pending-manual rows are few, but one source of
  // truth avoids ever silently capping at 1000. id tiebreaker on created_at →
  // total order → gap-free paging.
  let data: unknown[];
  try {
    data = await fetchAllRows(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from("attendance")
        // edited_by lets the admin panel show WHO submitted a foreman-created
        // pending row; edit_note carries the optional reason as a "הערה" line.
        .select("id, action, timestamp_label, clock_at, created_at, is_manual, status, lat, lng, distance_from_project_m, source, edited_by, edit_note, staff:staff_id(id, name, phone, role, attendance_exempt), project:project_id(id, name)")
        .is("deleted_at", null)
        .eq("status", "pending")
        .eq("is_manual", true);
      if (foremanProjectIds !== null) q = q.in("project_id", foremanProjectIds);
      return q.order("created_at", { ascending: false }).order("id", { ascending: false });
    });
  } catch (e) {
    console.error("[admin/attendance/pending]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "fetch failed" }, { status: 500 });
  }

  return NextResponse.json({ records: data });
}
