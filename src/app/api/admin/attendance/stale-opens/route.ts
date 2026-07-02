/**
 * GET /api/admin/attendance/stale-opens
 *
 * Surfaces attendance rows that are *orphan entries from previous days* —
 * a worker who clocked in and never clocked out, whose in-record is not
 * from today. The B1 signal path: instead of blocking a new clock-in when
 * yesterday's shift is still open (which strands the worker), we detect
 * the orphan here and let the admin / foreman dashboards flag it for
 * follow-up correction.
 *
 * Window: [now − 72h, todayStart). Strictly *before* today, so an open
 * shift a worker is currently on doesn't get counted; 72h back covers a
 * long-weekend gap (Thu-evening open still surfaces on Sunday).
 *
 * Aggregation is per (staff_id × Israel-local YMD): a day counts as an
 * orphan when `entries > exits` on that day. The timestamp reported is
 * the earliest unpaired entry — the moment the orphan shift began.
 *
 * Auth mirrors /api/admin/attendance/today:
 *   • admin  → sees everyone (including rows with project_id = null,
 *     which are workers who forgot to pick a project too).
 *   • foreman → scoped to attendance rows on projects they own; null
 *     project_id rows are excluded (that's an admin-side problem).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import {
  isAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";
import { israelDayStartISO } from "../../../../../lib/israel-time";
import { workDate, israelYMD, isEntry, isExit } from "../../../../../lib/attendance-time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StaleOpenItem {
  staff_id: string;
  staff_name: string;
  project_id: string | null;
  project_name: string | null;
  clock_at: string;   // ISO of the earliest unpaired entry on that day
  day_ymd: string;    // "YYYY-MM-DD" in Israel time
}

interface AttRow {
  action: string;
  clock_at: string | null;
  created_at: string;
  project_id: string | null;
  staff: { id: string; name: string } | { id: string; name: string }[] | null;
  project: { id: string; name: string } | { id: string; name: string }[] | null;
}

// Supabase's typed .select() sometimes returns joined FK objects as
// arrays even when the relationship is one-to-many-safe. Collapse
// defensively so downstream code can trust the shape.
function one<T>(v: T | T[] | null): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const isAdmin = getAdminRoleFromRequest(req) === "admin";

  // Foreman: restrict to project set. Empty set → nothing to show.
  let projectIds: string[] | null = null;
  if (!isAdmin) {
    const staffId = getForemanStaffIdFromRequest(req);
    if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: foremanProjects, error: fpErr } = await supabase
      .from("projects")
      .select("id")
      .eq("foreman_id", staffId);
    if (fpErr) {
      console.error("[attendance/stale-opens foreman-projects]", JSON.stringify(fpErr));
      return NextResponse.json({ error: fpErr.message }, { status: 500 });
    }
    projectIds = (foremanProjects ?? []).map((p: { id: string }) => p.id);
    if (projectIds.length === 0) return NextResponse.json({ items: [] });
  }

  // Window bounds.
  const todayYmd = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const todayStartISO = israelDayStartISO(todayYmd);
  const cutoffISO = new Date(Date.now() - 72 * 3600 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("attendance")
    .select("action, clock_at, created_at, project_id, staff:staff_id(id, name), project:project_id(id, name)")
    .is("deleted_at", null)
    .in("action", ["in", "כניסה", "out", "יציאה"])
    .gte("clock_at", cutoffISO)
    .lt("clock_at", todayStartISO)
    .order("clock_at", { ascending: true });

  if (projectIds !== null) {
    query = query.in("project_id", projectIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[attendance/stale-opens]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by (staff × Israel-local YMD). Within each group, count entries
  // and exits. A group is an orphan when entries > exits — the same
  // openEntryCount rule the guard uses, one calendar day at a time.
  const groups = new Map<
    string,
    { staffId: string; day: string; entries: AttRow[]; exits: AttRow[] }
  >();
  for (const r of (data ?? []) as AttRow[]) {
    const staff = one(r.staff);
    if (!staff || !r.clock_at) continue;
    const day = israelYMD(workDate(r));
    const key = `${staff.id}|${day}`;
    if (!groups.has(key)) {
      groups.set(key, { staffId: staff.id, day, entries: [], exits: [] });
    }
    const g = groups.get(key)!;
    if (isEntry(r.action)) g.entries.push(r);
    else if (isExit(r.action)) g.exits.push(r);
  }

  const items: StaleOpenItem[] = [];
  for (const g of groups.values()) {
    if (g.entries.length <= g.exits.length) continue;
    // Earliest unpaired entry — the moment the orphan shift began. The
    // rows arrived clock_at-ascending, so entries[0] is the first in.
    const firstEntry = g.entries[0];
    const staff = one(firstEntry.staff)!;
    const project = one(firstEntry.project);
    items.push({
      staff_id: staff.id,
      staff_name: staff.name,
      project_id: firstEntry.project_id,
      project_name: project?.name ?? null,
      clock_at: firstEntry.clock_at!,
      day_ymd: g.day,
    });
  }

  // Newest orphan first — the most-actionable rows lead.
  items.sort((a, b) => (a.day_ymd < b.day_ymd ? 1 : a.day_ymd > b.day_ymd ? -1 : 0));

  return NextResponse.json({ items });
}
