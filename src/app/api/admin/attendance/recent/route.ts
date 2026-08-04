import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { fetchAllRows } from "../../../../../lib/supabase-pagination";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { israelDayStartISO } from "../../../../../lib/israel-time";
import { workDate, israelYMD } from "../../../../../lib/attendance-time";

export const runtime = "nodejs";

// Shift a "YYYY-MM-DD" by N days (UTC-noon anchored to dodge DST seams).
function shiftYMD(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// GET — returns raw attendance records from the last N days (default 7, max 30)
// Admin only; used by the retroactive-edit panel in AdminPortal
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "7", 10) || 7, 1), 30);

  const supabase = createServerClient();
  const todayYMD = new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  const sinceYMD = new Date(Date.now() - (days - 1) * 86_400_000)
    .toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  // Widen the DB window 3 days back so a row whose *work* day is in range but
  // was inserted earlier isn't missed; the authoritative filter is by work
  // time in code below, mirroring /api/admin/attendance/report.
  const windowStart = israelDayStartISO(shiftYMD(sinceYMD, -3));

  // Paginate (shared helper) — one source of truth so this never truncates at
  // the 1000-row cap. id tiebreaker on the created_at order → total → gap-free.
  let data: Array<{ clock_at?: string | null; created_at: string }>;
  try {
    data = await fetchAllRows(() =>
      supabase
        .from("attendance")
        .select("id, action, timestamp_label, clock_at, created_at, is_manual, status, lat, lng, distance_from_project_m, source, staff:staff_id(id, name, phone, role, attendance_exempt), project:project_id(id, name)")
        .is("deleted_at", null)
        .gte("created_at", windowStart)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
    );
  } catch (e) {
    console.error("[admin/attendance/recent]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "fetch failed" }, { status: 500 });
  }

  // Authoritative filter: keep rows whose WORK day (clock_at, falling back to
  // created_at) falls in the last N days in Israel time — so "7 ימים אחרונים"
  // means 7 calendar work-days, not "inserted in the last 7 days". A manual
  // backfill for an old date inserted today carries an old clock_at and is
  // excluded; it stays editable via the 30-day worker-history panel.
  const records = (data ?? []).filter((r) => {
    const wd = israelYMD(workDate(r));
    return wd >= sinceYMD && wd <= todayYMD;
  });

  return NextResponse.json({ records });
}
