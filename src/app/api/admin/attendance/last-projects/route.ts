/**
 * GET /api/admin/attendance/last-projects
 *
 * For each worker, the project of their MOST RECENT clocked attendance row —
 * "where they last worked". Feeds the "מי לא הגיע היום" panel so the admin
 * sees where an absent worker is expected. Read-only, admin-only.
 *
 * Bounded to the last 120 days (newest-first, capped) so it stays a cheap
 * single query; a worker who hasn't clocked in 120 days simply has no last
 * project (secondary info, absence-safe).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const cutoff = new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from("attendance")
    .select("staff_id, clock_at, project:project_id(name)")
    .is("deleted_at", null)
    .not("clock_at", "is", null)
    .gte("clock_at", cutoff)
    .order("clock_at", { ascending: false })
    .limit(4000);

  if (error) {
    console.error("[admin/attendance/last-projects]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Rows arrive newest-first → the first row seen per staff is their latest.
  const last: Record<string, string | null> = {};
  for (const r of (data ?? []) as Array<{ staff_id: string; project: { name: string } | { name: string }[] | null }>) {
    if (!r.staff_id || r.staff_id in last) continue;
    const proj = Array.isArray(r.project) ? r.project[0] : r.project;
    last[r.staff_id] = proj?.name ?? null;
  }

  return NextResponse.json({ last });
}
