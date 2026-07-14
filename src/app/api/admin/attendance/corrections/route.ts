/**
 * GET /api/admin/attendance/corrections
 *
 * Returns all pending worker-submitted correction requests, joined with the
 * underlying attendance row and the requesting worker. Used by the admin
 * attendance tab to render a "בקשות תיקון מעובדים" panel alongside the
 * existing manual-entry approvals.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import {
  isAdminAuthedFromRequest,
  isAuthedFromRequest,
  getRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const role = getRoleFromRequest(req);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("attendance_corrections")
    .select(`
      id, attendance_id, staff_id, proposed_time, reason, status, request_type, created_at,
      attendance:attendance_id ( id, action, clock_at, timestamp_label, project_id ),
      staff:staff_id ( id, name, phone, language )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Foreman scope: only requests whose underlying attendance row belongs
  // to one of their projects. Admin sees everything.
  if (role === "foreman" && !isAdminAuthedFromRequest(req)) {
    const staffId = getForemanStaffIdFromRequest(req);
    if (!staffId) return NextResponse.json({ requests: [] });
    const { data: myProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("foreman_id", staffId);
    const projectIds = (myProjects ?? []).map((p: { id: string }) => p.id);
    if (projectIds.length === 0) return NextResponse.json({ requests: [] });
    // PostgREST inner-filter on the joined attendance.project_id.
    query = query.in("attendance.project_id", projectIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/attendance/corrections GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = (data ?? []) as Array<{ staff_id: string; created_at: string }>;

  // Per-worker monthly count (awareness, never a hard cap): for each pending
  // request, how many corrections that worker filed in the SAME Israel calendar
  // month — ALL statuses, because the pattern is what matters, not the outcome.
  const ilMonth = (iso: string) =>
    new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" }).slice(0, 7);
  const staffIds = [...new Set(requests.map((r) => r.staff_id))];
  const monthCount = new Map<string, number>(); // `${staff_id}|${YYYY-MM}` → n
  if (staffIds.length > 0) {
    const { data: allCorr } = await supabase
      .from("attendance_corrections")
      .select("staff_id, created_at")
      .in("staff_id", staffIds);
    for (const c of (allCorr ?? []) as Array<{ staff_id: string; created_at: string }>) {
      const key = `${c.staff_id}|${ilMonth(c.created_at)}`;
      monthCount.set(key, (monthCount.get(key) ?? 0) + 1);
    }
  }
  const withCounts = requests.map((r) => ({
    ...r,
    month_count: monthCount.get(`${r.staff_id}|${ilMonth(r.created_at)}`) ?? 1,
  }));

  return NextResponse.json({ requests: withCounts });
}
