/**
 * GET /api/admin/attendance/locations?staff_id=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * One row per clock-in for a SINGLE worker, carrying the GPS fields the
 * per-worker location screen needs: lat/lng, distance_from_project_m, source.
 * Unlike /report (which aggregates per worker per day) this returns the raw
 * events — the whole point is "when was this worker where", anomalies included.
 *
 * ADMIN ONLY. A worker's geographic location is sensitive; foremen get 403
 * even for workers on their own projects (they already see live DistanceFlag
 * on the "today" board — that's the only place they need it).
 *
 * clock_at (TIMESTAMPTZ) is the authoritative work timestamp; timestamp_label
 * is a human fallback. DB query widened ±35 days on created_at so retroactive
 * backfills are still pulled (the C2/C3 family); in-range filtering happens in
 * code by clock_at so the output shape doesn't widen. Paginated via
 * fetchAllRows — a wide range for a busy worker can exceed the 1000-row cap.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "../../../../../lib/admin-auth";
import { createServerClient } from "../../../../../lib/supabase";
import { israelDayStartISO, israelDayEndISO } from "../../../../../lib/israel-time";
import { fetchAllRows } from "../../../../../lib/supabase-pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resolve the authoritative work Date: prefer clock_at, fall back to created_at. */
function workDate(rec: { clock_at?: string | null; created_at: string }): Date {
  return rec.clock_at ? new Date(rec.clock_at) : new Date(rec.created_at);
}

/** "YYYY-MM-DD" for a Date in Israel timezone. */
function toYMD(d: Date): string {
  return d.toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
}

/** Shift a "YYYY-MM-DD" by N days (UTC-noon anchor dodges DST). */
function shiftYMD(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type AttLocRow = {
  id: string;
  action: string;
  clock_at: string | null;
  created_at: string;
  source: string | null;
  lat: number | null;
  lng: number | null;
  distance_from_project_m: number | null;
  project: unknown;
};

export async function GET(req: NextRequest) {
  try {
    // Admin only — location is sensitive; no foreman fallback.
    if (getAdminRoleFromRequest(req) !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staff_id");
    if (!staffId) {
      return NextResponse.json({ error: "חסר staff_id" }, { status: 400 });
    }

    const today = new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
    const thirtyDaysAgo = new Date(Date.now() - 29 * 86_400_000)
      .toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
    const from = searchParams.get("from") || thirtyDaysAgo;
    const to   = searchParams.get("to")   || today;

    const supabase = createServerClient();

    // ±35-day widening on created_at so backfilled shifts aren't pre-cut by
    // SQL; the workDate/clock_at filter below clamps output back to [from, to].
    let data: AttLocRow[];
    try {
      data = await fetchAllRows<AttLocRow>(() =>
        supabase
          .from("attendance")
          .select(
            "id, action, clock_at, created_at, source, lat, lng, distance_from_project_m, project:project_id(name)",
          )
          .is("deleted_at", null)
          .eq("staff_id", staffId)
          .gte("created_at", israelDayStartISO(shiftYMD(from, -35)))
          .lte("created_at", israelDayEndISO(shiftYMD(to, +35)))
          .order("clock_at", { ascending: false })
          .order("id", { ascending: false }),
      );
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "attendance fetch failed" },
        { status: 500 },
      );
    }

    // Clamp to [from, to] by the Israel-local YMD of the work timestamp, then
    // shape each event. lat/lng returned as strings so DistanceFlag (typed
    // string|null, shared with the live board) consumes them unchanged.
    const rows = (data ?? [])
      .map((rec) => {
        const workYMD = toYMD(workDate(rec));
        return { rec, workYMD };
      })
      .filter(({ workYMD }) => workYMD >= from && workYMD <= to)
      .map(({ rec, workYMD }) => ({
        id: rec.id,
        action: rec.action,
        clock_at: rec.clock_at ?? rec.created_at,
        ymd: workYMD,
        source: rec.source ?? null,
        lat: rec.lat != null ? String(rec.lat) : null,
        lng: rec.lng != null ? String(rec.lng) : null,
        distance_from_project_m: rec.distance_from_project_m ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        project_name: (rec.project as any)?.name ?? null,
      }));

    return NextResponse.json({ rows, from, to, staff_id: staffId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "server error" },
      { status: 500 },
    );
  }
}
