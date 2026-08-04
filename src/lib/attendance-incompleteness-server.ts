/**
 * Server-side loader for the incompleteness engine — the ONE place that
 * fetches the raw attendance / failure / pending-correction data, flattens the
 * Supabase joins, and runs the pure engine (attendance-incompleteness.ts).
 *
 * Shared by every server consumer so the fetch shape has a single origin:
 *   • GET /api/admin/attendance/incomplete        (the endpoint)
 *   • GET /api/admin/payroll/export               (the XLSX note)
 *
 * The pure engine stays untouched; this only feeds it.
 */

import { israelDayStartISO } from "./israel-time";
import { fetchAllRows } from "./supabase-pagination";
import {
  computeIncompleteDays,
  summarizeIncomplete,
  type IncompleteItem,
  type IncompleteSummary,
  type EngineAttendanceRow,
  type EngineFailureRow,
  type EngineCorrectionRow,
} from "./attendance-incompleteness";

// Collapse a joined FK that Supabase may return as an object or a 1-elem array.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export interface LoadIncompletenessOpts {
  /** Israel-local "YYYY-MM-DD" range, inclusive. */
  from: string;
  to: string;
  staffId?: string | null;
  /** Foreman scope: null = admin (everything); string[] = only these projects. */
  projectIds?: string[] | null;
}

export async function loadIncompleteness(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  opts: LoadIncompletenessOpts,
): Promise<{ items: IncompleteItem[]; summary: IncompleteSummary }> {
  const { from, to, staffId = null, projectIds = null } = opts;

  const todayYmd = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
  // clock_at < start-of-day(to + 1) → inclusive of the whole `to` day.
  const toNext = new Date(new Date(`${to}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
  const fromISO = israelDayStartISO(from);
  const toISO = israelDayStartISO(toNext);

  // Paginate all three feeds — a month across every worker/project can exceed
  // the 1000-row cap; a truncated fetch would make the incompleteness gate MISS
  // real gaps (or falsely flag complete days). The id tiebreaker makes each
  // order total so paging is gap-free. fetchAllRows throws on error (as the old
  // code did) — caught by loadIncompleteness's callers.
  // ── Attendance ─────────────────────────────────────────────────────────
  const attRaw = await fetchAllRows<Record<string, unknown>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("attendance")
      .select("id, staff_id, action, clock_at, created_at, status, is_manual, project_id, staff:staff_id(name), project:project_id(name)")
      .is("deleted_at", null)
      .gte("clock_at", fromISO)
      .lt("clock_at", toISO);
    if (staffId) q = q.eq("staff_id", staffId);
    if (projectIds !== null) q = q.in("project_id", projectIds);
    return q.order("clock_at", { ascending: true }).order("id", { ascending: true });
  });

  // ── worker_stuck failures ──────────────────────────────────────────────
  const failRaw = await fetchAllRows<Record<string, unknown>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("attendance_failures")
      .select("id, staff_id, attempted_at, error_code, project_id, staff:staff_id(name), project:project_id(name)")
      .eq("category", "worker_stuck")
      .gte("attempted_at", fromISO)
      .lt("attempted_at", toISO);
    if (staffId) q = q.eq("staff_id", staffId);
    if (projectIds !== null) q = q.in("project_id", projectIds);
    return q.order("attempted_at", { ascending: true }).order("id", { ascending: true });
  });

  // ── Pending corrections ────────────────────────────────────────────────
  const corrRaw = await fetchAllRows<Record<string, unknown>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("attendance_corrections")
      .select("id, staff_id, staff:staff_id(name), attendance:attendance_id(clock_at, created_at, project_id, project:project_id(name))")
      .eq("status", "pending");
    if (staffId) q = q.eq("staff_id", staffId);
    if (projectIds !== null) q = q.in("attendance.project_id", projectIds);
    return q.order("id", { ascending: true });
  });

  // ── Flatten joins → engine input ───────────────────────────────────────
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
    error_code: r.error_code ?? null,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingCorrections: EngineCorrectionRow[] = ((corrRaw ?? []) as any[])
    // A foreman inner-filter can null the joined attendance; drop those.
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

  const items = computeIncompleteDays({ attendance, failures, pendingCorrections }, { todayYmd });
  const summary = summarizeIncomplete(items);
  return { items, summary };
}
