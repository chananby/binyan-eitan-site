/**
 * GET /api/admin/attendance/report?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns a structured weekly attendance report:
 *   rows[]    — one row per worker per day (entry, exit, hours, project)
 *   summary[] — one row per worker (total days, total hours)
 *
 * clock_at (TIMESTAMPTZ) is the authoritative work timestamp.
 * timestamp_label is kept as a human-readable fallback in the DB.
 *
 * DB query is widened by ±35 days on created_at so retroactive backfills
 * (rows inserted a month+ after the shift they belong to) are still pulled
 * from SQL — the C2/C3 family of bugs. ±3 was enough for TZ edges but
 * silently dropped every backfilled shift; 35 covers a full calendar month
 * + slack. In-range filtering still happens in code by clock_at so the
 * output shape doesn't widen — the SQL just stops pre-cutting.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";
import { createServerClient } from "../../../../../lib/supabase";
import { israelDayStartISO, israelDayEndISO } from "../../../../../lib/israel-time";
import { fetchAllRows } from "../../../../../lib/supabase-pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Timestamp helpers ─────────────────────────────────────────────────────────

/** Resolve the authoritative work Date from a record: prefer clock_at, fall back to created_at. */
function workDate(rec: { clock_at?: string | null; created_at: string }): Date {
  return rec.clock_at ? new Date(rec.clock_at) : new Date(rec.created_at);
}

/** "YYYY-MM-DD" for a Date in Israel timezone. */
function toYMD(d: Date): string {
  return d.toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" }); // sv locale → YYYY-MM-DD
}

function israelTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// Convert a "YYYY-MM-DD" string to start/end-of-day ISO in Israel time.
// Uses DST-aware conversion (winter UTC+2, summer UTC+3).
const dayStartISO = israelDayStartISO;
const dayEndISO   = israelDayEndISO;

// Shift a YYYY-MM-DD by N days
function shiftYMD(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    if (!isAuthedFromRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const today = new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
    const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000)
      .toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });

    const from = searchParams.get("from") || sevenDaysAgo;
    const to   = searchParams.get("to")   || today;

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Foreman: restrict to their assigned projects
    const isAdmin = getAdminRoleFromRequest(req) === "admin";
    let allowedProjectIds: string[] | null = null;
    if (!isAdmin) {
      const staffId = getForemanStaffIdFromRequest(req);
      if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const supabaseServer = createServerClient();
      const { data: fp } = await supabaseServer
        .from("projects")
        .select("id")
        .eq("foreman_id", staffId);
      allowedProjectIds = (fp ?? []).map((p: { id: string }) => p.id);
      if (allowedProjectIds.length === 0)
        return NextResponse.json({ rows: [], summary: [], from, to });
    }

    // Widen DB query by ±35 days on created_at to catch retroactive
    // backfills — same C2/C3 fix applied earlier to staff/[id]/history
    // and staff/export. The in-code clock_at filter (workDate) still
    // clamps output to [from, to] so the widened SQL doesn't leak.
    // Paginate: a wide date range across all workers exceeds the 1000-row cap
    // and used to truncate silently. Keep the existing created_at order + an id
    // tiebreaker so paging is total (no gaps); the grouping below re-sorts.
    type AttReportRow = {
      id: string; action: string; clock_at: string | null; created_at: string;
      staff: unknown; project: unknown;
    };
    let data: AttReportRow[];
    try {
      data = await fetchAllRows<AttReportRow>(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = supabase
          .from("attendance")
          .select("id, action, clock_at, created_at, staff:staff_id(id, name, phone), project:project_id(name)")
          .is("deleted_at", null)
          .gte("created_at", dayStartISO(shiftYMD(from, -35)))
          .lte("created_at", dayEndISO(shiftYMD(to, +35)));
        if (allowedProjectIds !== null) q = q.in("project_id", allowedProjectIds);
        return q.order("created_at", { ascending: true }).order("id", { ascending: true });
      });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "attendance fetch failed" }, { status: 500 });
    }

    // ── Group: staffId → workDateStr → { entries[], exits[], projects[] } ──────
    type Rec = AttReportRow;
    const grouped = new Map<string, Map<string, { entries: Rec[]; exits: Rec[]; staffName: string; staffPhone: string; projects: string[] }>>();

    for (const rec of data ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const staff = rec.staff as any;
      const staffId    = staff?.id    ?? "unknown";
      const staffName  = staff?.name  ?? "—";
      const staffPhone = staff?.phone ?? "—";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projectName = (rec.project as any)?.name ?? "";

      const workD    = workDate(rec);
      const workYMD  = toYMD(workD);
      const workDateStr = workD.toLocaleDateString("he-IL", {
        timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric",
      });
      // Skip records whose actual work date is outside the requested range
      if (workYMD < from || workYMD > to) continue;

      if (!grouped.has(staffId)) grouped.set(staffId, new Map());
      const byDate = grouped.get(staffId)!;

      if (!byDate.has(workDateStr)) {
        byDate.set(workDateStr, { entries: [], exits: [], staffName, staffPhone, projects: [] });
      }
      const day = byDate.get(workDateStr)!;

      if (rec.action === "כניסה" || rec.action === "in") day.entries.push(rec);
      else if (rec.action === "יציאה" || rec.action === "out") day.exits.push(rec);
      if (projectName) day.projects.push(projectName);
    }

    // ── Build rows ────────────────────────────────────────────────────────────
    // _diffMs is kept on each row for accurate summary summation; never sent
    // to the client — stripped after the summary loop.
    const rows: {
      staff_name: string; staff_phone: string;
      date: string; entry: string; exit: string;
      hours: number | null; project: string;
      _diffMs?: number;
    }[] = [];

    for (const [, byDate] of grouped) {
      // Sort dates ascending by their Hebrew date string (DD.MM.YYYY)
      const sortedDates = [...byDate.entries()].sort((a, b) => {
        // Convert "DD.MM.YYYY" → "YYYY-MM-DD" for reliable sort
        const toSortable = (s: string) => s.split(".").reverse().join("-");
        return toSortable(a[0]).localeCompare(toSortable(b[0]));
      });

      for (const [dateStr, day] of sortedDates) {
        const firstEntry = day.entries[0] ?? null;
        const lastExit   = day.exits[day.exits.length - 1] ?? null;

        const entryDisplay = firstEntry ? israelTime(workDate(firstEntry).toISOString()) : "—";
        const exitDisplay  = lastExit   ? israelTime(workDate(lastExit).toISOString())   : "—";

        let hours: number | null = null;
        let diffMs: number | undefined;
        if (firstEntry && lastExit) {
          const ms = workDate(lastExit).getTime() - workDate(firstEntry).getTime();
          if (ms > 0) {
            diffMs = ms;
            hours = Math.round(ms / 36_000) / 100;
          }
        }

        // Most-mentioned project for the day
        const projectCount: Record<string, number> = {};
        for (const p of day.projects) projectCount[p] = (projectCount[p] ?? 0) + 1;
        const project = Object.entries(projectCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

        rows.push({
          staff_name:  day.staffName,
          staff_phone: day.staffPhone,
          date:        dateStr,
          entry:       entryDisplay,
          exit:        exitDisplay,
          hours,
          project,
          _diffMs: diffMs,
        });
      }
    }

    // Sort rows: staff name → date
    rows.sort((a, b) => {
      const nameSort = a.staff_name.localeCompare(b.staff_name, "he");
      if (nameSort !== 0) return nameSort;
      const toSortable = (s: string) => s.split(".").reverse().join("-");
      return toSortable(a.date).localeCompare(toSortable(b.date));
    });

    // ── Summary ───────────────────────────────────────────────────────────────
    // Sum raw milliseconds across days and round ONCE at the end.
    // Avoids the per-day rounding drift (~9 min/month) of summing rounded hours.
    const summaryMap = new Map<string, { name: string; phone: string; days: number; _ms: number }>();
    for (const row of rows) {
      const key = row.staff_phone;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, { name: row.staff_name, phone: row.staff_phone, days: 0, _ms: 0 });
      }
      const s = summaryMap.get(key)!;
      s.days++;
      if (row._diffMs && row._diffMs > 0) s._ms += row._diffMs;
    }
    const summary = [...summaryMap.values()]
      .map((s) => ({ name: s.name, phone: s.phone, days: s.days, hours: Math.round(s._ms / 36_000) / 100 }))
      .sort((a, b) => a.name.localeCompare(b.name, "he"));

    // Strip internal _diffMs from rows before sending to client.
    const rowsOut = rows.map(({ _diffMs, ...rest }) => rest);

    return NextResponse.json({ rows: rowsOut, summary, from, to });
  } catch (fatal) {
    console.error("[attendance/report] FATAL:", fatal);
    return NextResponse.json({ error: String(fatal) }, { status: 500 });
  }
}
