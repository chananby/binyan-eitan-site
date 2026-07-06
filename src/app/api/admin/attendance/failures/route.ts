/**
 * GET /api/admin/attendance/failures — silent-failure log for the admin
 * "worker got stuck" panel.
 *
 * Returns `category='worker_stuck'` rows from the last 24 hours, joined
 * to the staff name (and project name when the failure carried a
 * project id — mainly the GPS-related codes). Sorted newest-first so
 * the panel shows the most recent block at the top.
 *
 * Categories `noise` and `security_signal` are DELIBERATELY not
 * returned — those are archived for pattern analysis via SQL, not for
 * the admin's daily attention view. See attendance_failures migration
 * and failClock() in /api/attendance/route.ts for the rationale.
 *
 * Admin only. Foreman scope is intentionally out of the v1 cut —
 * failures cross projects and the admin/legal audit trail owns them.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const cutoffISO = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from("attendance_failures")
    .select(
      "id, error_code, http_status, action, distance_m, attempted_at, " +
      "staff:staff_id(id, name), project:project_id(id, name)"
    )
    .eq("category", "worker_stuck")
    .gte("attempted_at", cutoffISO)
    .order("attempted_at", { ascending: false })
    // Safety valve — a bad deploy could spam thousands of server_error
    // rows in an hour. 500 is more than enough for a normal 24h view
    // (typical: 1-3; incident: 15-20).
    .limit(500);

  if (error) {
    console.error("[admin/attendance/failures]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ failures: data ?? [] });
}
