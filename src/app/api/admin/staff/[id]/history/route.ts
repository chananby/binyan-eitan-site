import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import {
  isAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../../lib/admin-auth";
import {
  aggregateWorkerHistory,
  type WorkerHistoryRecord,
  type WorkerVacationDay,
} from "../../../../../../lib/worker-history-aggregate";

export const runtime = "nodejs";

// GET /api/admin/staff/[id]/history?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Returns the day-by-day timeline for a single worker. Default range is the
// last 30 days (today inclusive). Admin sees any worker; foreman is limited
// to workers who have attendance in projects assigned to them.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const today = new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  const thirtyDaysAgo = new Date(Date.now() - 29 * 86_400_000)
    .toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  const from = searchParams.get("from") ?? thirtyDaysAgo;
  const to   = searchParams.get("to")   ?? today;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "Invalid date format (expected YYYY-MM-DD)" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "from must be <= to" }, { status: 400 });
  }

  const supabase = createServerClient();
  const isAdmin = getAdminRoleFromRequest(req) === "admin";

  // Foreman: must have at least one attendance row by this worker in a
  // project assigned to them. Same scoping rule as /api/admin/staff (GET).
  if (!isAdmin) {
    const foremanStaffId = getForemanStaffIdFromRequest(req);
    if (!foremanStaffId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: foremanProjects, error: fpErr } = await supabase
      .from("projects")
      .select("id")
      .eq("foreman_id", foremanStaffId);
    if (fpErr) {
      console.error("[staff/[id]/history projects]", JSON.stringify(fpErr));
      return NextResponse.json({ error: fpErr.message }, { status: 500 });
    }
    const projectIds = (foremanProjects ?? []).map((p: { id: string }) => p.id);
    if (projectIds.length === 0) {
      return NextResponse.json({ error: "אין הרשאה לצפות בעובד זה" }, { status: 403 });
    }

    const { count, error: cErr } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("staff_id", params.id)
      .in("project_id", projectIds);
    if (cErr) {
      console.error("[staff/[id]/history scope]", JSON.stringify(cErr));
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }
    if (!count || count === 0) {
      return NextResponse.json({ error: "אין הרשאה לצפות בעובד זה" }, { status: 403 });
    }
  }

  // Widen the attendance window by ±35 days on created_at so retroactive
  // backfills (rows inserted a month+ after the shift they belong to) are
  // still pulled from SQL — the C1 family of bugs. ±3 days was enough for
  // TZ edges but silently dropped every backfilled shift; 35 covers a full
  // calendar month + slack for late-of-month entries.
  // aggregateWorkerHistory filters back to [from, to] on the Israel-local
  // YMD of workDate (clock_at ?? created_at), so widening the SQL doesn't
  // widen the output — it only stops SQL from cutting off legitimate rows
  // before the aggregator can see them.
  const widenedFrom = new Date(`${from}T12:00:00Z`);
  widenedFrom.setUTCDate(widenedFrom.getUTCDate() - 35);
  const widenedTo = new Date(`${to}T12:00:00Z`);
  widenedTo.setUTCDate(widenedTo.getUTCDate() + 35);

  const [attResult, vacResult] = await Promise.all([
    supabase
      .from("attendance")
      .select("id, staff_id, action, clock_at, created_at, status, project:project_id(id, name)")
      .is("deleted_at", null)
      .eq("staff_id", params.id)
      .gte("created_at", widenedFrom.toISOString())
      .lte("created_at", widenedTo.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("vacation_days")
      .select("date, half_day")
      .eq("staff_id", params.id)
      .gte("date", from)
      .lte("date", to),
  ]);

  if (attResult.error) {
    console.error("[staff/[id]/history att]", JSON.stringify(attResult.error));
    return NextResponse.json({ error: attResult.error.message }, { status: 500 });
  }
  if (vacResult.error) {
    console.error("[staff/[id]/history vac]", JSON.stringify(vacResult.error));
    return NextResponse.json({ error: vacResult.error.message }, { status: 500 });
  }

  const days = aggregateWorkerHistory(
    (attResult.data ?? []) as unknown as WorkerHistoryRecord[],
    (vacResult.data ?? []) as unknown as WorkerVacationDay[],
    from,
    to,
  );

  return NextResponse.json({ from, to, staff_id: params.id, days });
}
