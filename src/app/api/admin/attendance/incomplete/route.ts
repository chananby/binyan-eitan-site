/**
 * GET /api/admin/attendance/incomplete?from&to&staff_id?
 *
 * The single "what's missing / damaged" endpoint. Fetches the raw attendance /
 * failure / pending-correction data for the range, flattens the Supabase
 * joins, and runs the pure engine (lib/attendance-incompleteness.ts). Returns:
 *
 *   { items: IncompleteItem[], summary: { day_count, by_issue } }
 *
 * Range defaults to the last 3 months. Auth mirrors the other attendance
 * endpoints: admin sees everything; foreman is scoped to attendance / failures
 * / corrections on the projects they own (null-project rows — e.g. no_project —
 * are admin-side and don't reach a foreman).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import {
  isAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";
import { israelDayStartISO } from "../../../../../lib/israel-time";
import {
  computeIncompleteDays,
  summarizeIncomplete,
  type EngineAttendanceRow,
  type EngineFailureRow,
  type EngineCorrectionRow,
} from "../../../../../lib/attendance-incompleteness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Collapse a joined FK that Supabase may hand back as an object or a 1-elem array.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

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
  // clock_at < start-of-day(to + 1) → inclusive of the whole `to` day.
  const toNext = new Date(new Date(`${to}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
  const fromISO = israelDayStartISO(from);
  const toISO = israelDayStartISO(toNext);

  // ── Foreman scope ────────────────────────────────────────────────────────
  const isAdmin = getAdminRoleFromRequest(req) === "admin";
  let projectIds: string[] | null = null;
  if (!isAdmin) {
    const foremanStaffId = getForemanStaffIdFromRequest(req);
    if (!foremanStaffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: fp } = await supabase.from("projects").select("id").eq("foreman_id", foremanStaffId);
    projectIds = (fp ?? []).map((p: { id: string }) => p.id);
    if (projectIds.length === 0) {
      return NextResponse.json({ items: [], summary: { day_count: 0, by_issue: {} } });
    }
  }

  // ── Attendance ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let attQuery: any = supabase
    .from("attendance")
    .select("id, staff_id, action, clock_at, created_at, status, is_manual, project_id, staff:staff_id(name), project:project_id(name)")
    .is("deleted_at", null)
    .gte("clock_at", fromISO)
    .lt("clock_at", toISO);
  if (staffId) attQuery = attQuery.eq("staff_id", staffId);
  if (projectIds !== null) attQuery = attQuery.in("project_id", projectIds);
  const { data: attRaw, error: attErr } = await attQuery;
  if (attErr) {
    console.error("[attendance/incomplete att]", JSON.stringify(attErr));
    return NextResponse.json({ error: attErr.message }, { status: 500 });
  }

  // ── worker_stuck failures ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let failQuery: any = supabase
    .from("attendance_failures")
    .select("id, staff_id, attempted_at, project_id, staff:staff_id(name), project:project_id(name)")
    .eq("category", "worker_stuck")
    .gte("attempted_at", fromISO)
    .lt("attempted_at", toISO);
  if (staffId) failQuery = failQuery.eq("staff_id", staffId);
  if (projectIds !== null) failQuery = failQuery.in("project_id", projectIds);
  const { data: failRaw, error: failErr } = await failQuery;
  if (failErr) {
    console.error("[attendance/incomplete fail]", JSON.stringify(failErr));
    return NextResponse.json({ error: failErr.message }, { status: 500 });
  }

  // ── Pending corrections ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let corrQuery: any = supabase
    .from("attendance_corrections")
    .select("id, staff_id, staff:staff_id(name), attendance:attendance_id(clock_at, created_at, project_id, project:project_id(name))")
    .eq("status", "pending");
  if (staffId) corrQuery = corrQuery.eq("staff_id", staffId);
  if (projectIds !== null) corrQuery = corrQuery.in("attendance.project_id", projectIds);
  const { data: corrRaw, error: corrErr } = await corrQuery;
  if (corrErr) {
    console.error("[attendance/incomplete corr]", JSON.stringify(corrErr));
    return NextResponse.json({ error: corrErr.message }, { status: 500 });
  }

  // ── Flatten joins → engine input ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attendance: EngineAttendanceRow[] = ((attRaw ?? []) as any[]).map((r) => ({
    id: r.id,
    staff_id: r.staff_id,
    staff_name: one<{ name: string }>(r.staff)?.name ?? null,
    action: r.action,
    clock_at: r.clock_at,
    created_at: r.created_at,
    status: r.status ?? null,
    is_manual: r.is_manual ?? null,
    project_id: r.project_id ?? null,
    project_name: one<{ name: string }>(r.project)?.name ?? null,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const failures: EngineFailureRow[] = ((failRaw ?? []) as any[]).map((r) => ({
    id: r.id,
    staff_id: r.staff_id,
    staff_name: one<{ name: string }>(r.staff)?.name ?? null,
    attempted_at: r.attempted_at,
    project_id: r.project_id ?? null,
    project_name: one<{ name: string }>(r.project)?.name ?? null,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingCorrections: EngineCorrectionRow[] = ((corrRaw ?? []) as any[])
    // A foreman inner-filter on attendance.project_id can null out the joined
    // attendance; drop those (not on their projects).
    .filter((r) => one(r.attendance) !== null || projectIds === null)
    .map((r) => {
      const a = one<{ clock_at: string | null; created_at: string; project_id: string | null; project: { name: string } | { name: string }[] | null }>(r.attendance);
      return {
        id: r.id,
        staff_id: r.staff_id,
        staff_name: one<{ name: string }>(r.staff)?.name ?? null,
        clock_at: a?.clock_at ?? null,
        created_at: a?.created_at ?? new Date().toISOString(),
        project_id: a?.project_id ?? null,
        project_name: one<{ name: string }>(a?.project)?.name ?? null,
      };
    });

  const items = computeIncompleteDays(
    { attendance, failures, pendingCorrections },
    { todayYmd },
  );
  const summary = summarizeIncomplete(items);

  return NextResponse.json({ from, to, items, summary });
}
