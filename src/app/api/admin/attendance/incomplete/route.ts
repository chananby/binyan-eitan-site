/**
 * GET /api/admin/attendance/incomplete?from&to&staff_id?
 *
 * The single "what's missing / damaged" endpoint. Thin wrapper over
 * loadIncompleteness (lib/attendance-incompleteness-server.ts), which fetches
 * the raw data and runs the pure engine. Returns:
 *
 *   { from, to, items: IncompleteItem[], summary: { day_count, by_issue } }
 *
 * Range defaults to the last 3 months. Auth mirrors the other attendance
 * endpoints: admin sees everything; foreman is scoped to their projects
 * (null-project rows — e.g. no_project — are admin-side).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import {
  isAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";
import { loadIncompleteness } from "../../../../../lib/attendance-incompleteness-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staff_id");

  // ── Range (default: last 3 months, Israel time) ──────────────────────────
  const todayYmd = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const toParam = searchParams.get("to");
  const fromParam = searchParams.get("from");
  const to = toParam && YMD.test(toParam) ? toParam : todayYmd;
  let from: string;
  if (fromParam && YMD.test(fromParam)) {
    from = fromParam;
  } else {
    const d = new Date(`${to}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 3);
    from = d.toISOString().slice(0, 10);
  }

  // ── Foreman scope ────────────────────────────────────────────────────────
  const isAdmin = getAdminRoleFromRequest(req) === "admin";
  let projectIds: string[] | null = null;
  if (!isAdmin) {
    const foremanStaffId = getForemanStaffIdFromRequest(req);
    if (!foremanStaffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: fp } = await supabase.from("projects").select("id").eq("foreman_id", foremanStaffId);
    projectIds = (fp ?? []).map((p: { id: string }) => p.id);
    if (projectIds.length === 0) {
      return NextResponse.json({ from, to, items: [], summary: { day_count: 0, by_issue: {} } });
    }
  }

  try {
    const { items, summary } = await loadIncompleteness(supabase, { from, to, staffId, projectIds });
    return NextResponse.json({ from, to, items, summary });
  } catch (e) {
    console.error("[attendance/incomplete]", String(e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
