/**
 * GET /api/admin/attendance/report?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns a structured weekly attendance report:
 *   rows[]    — one row per worker per day (entry, exit, hours, project)
 *   summary[] — one row per worker (total days, total hours)
 *
 * timestamp_label format (set by AttendanceForm/clock-out):
 *   "DD.MM.YYYY, HH:MM"  (Hebrew toLocaleString output)
 *
 * We parse this to get the ACTUAL work date and time, since created_at
 * reflects when the record was inserted (which may differ — e.g. retroactive entry).
 *
 * DB query is widened by ±3 days so retroactively-inserted records aren't missed;
 * in-range filtering happens in code using the parsed work date.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";
import { createServerClient } from "../../../../../lib/supabase";

export const runtime = "nodejs";

// ── Timestamp helpers ─────────────────────────────────────────────────────────

/**
 * Parse "DD.MM.YYYY, HH:MM" (or "DD.MM.YYYY HH:MM") → Date (Israel +03:00).
 * Returns null if the format is unrecognised.
 */
function parseLabelDateTime(label: string | null | undefined): Date | null {
  if (!label) return null;
  // Remove optional comma, then split on any whitespace
  const parts = label.replace(",", "").trim().split(/\s+/);
  if (parts.length < 2) return null;
  const [datePart, timePart] = parts;
  const [day, month, year] = datePart.split(".");
  const [hour, minute]     = timePart.split(":");
  if (!day || !month || !year || !hour || !minute) return null;
  // Fixed +03:00 offset — close enough for report purposes (DST shifts ≤1 h)
  const d = new Date(`${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}T${hour.padStart(2,"0")}:${minute.padStart(2,"0")}:00+03:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Extract just "HH:MM" from the label; fall back to empty string. */
function labelTime(label: string | null | undefined): string {
  const d = parseLabelDateTime(label);
  if (!d) return "";
  return d.toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** Extract "DD.MM.YYYY" date string from the label; fall back to null. */
function labelDate(label: string | null | undefined): string | null {
  const d = parseLabelDateTime(label);
  if (!d) return null;
  return d.toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/** "YYYY-MM-DD" for a Date in Israel timezone. */
function toYMD(d: Date): string {
  return d.toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" }); // sv locale → YYYY-MM-DD
}

function israelDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric",
  });
}
function israelTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// Convert a "YYYY-MM-DD" string to start/end-of-day ISO in Israel time
function dayStartISO(ymd: string): string { return new Date(`${ymd}T00:00:00+03:00`).toISOString(); }
function dayEndISO(ymd: string): string   { return new Date(`${ymd}T23:59:59+03:00`).toISOString(); }

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

    // Widen DB query by ±3 days to catch retroactively-entered records
    let query = supabase
      .from("attendance")
      .select("id, action, timestamp_label, created_at, staff:staff_id(id, name, phone), project:project_id(name)")
      .gte("created_at", dayStartISO(shiftYMD(from, -3)))
      .lte("created_at", dayEndISO(shiftYMD(to, +3)));

    if (allowedProjectIds !== null) {
      query = query.in("project_id", allowedProjectIds);
    }

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Group: staffId → workDateStr → { entries[], exits[], projects[] } ──────
    type Rec = typeof data[number];
    const grouped = new Map<string, Map<string, { entries: Rec[]; exits: Rec[]; staffName: string; staffPhone: string; projects: string[] }>>();

    for (const rec of data ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const staff = rec.staff as any;
      const staffId    = staff?.id    ?? "unknown";
      const staffName  = staff?.name  ?? "—";
      const staffPhone = staff?.phone ?? "—";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projectName = (rec.project as any)?.name ?? "";

      // Use the ACTUAL work date from timestamp_label, not created_at
      const workDateStr = labelDate(rec.timestamp_label) ?? israelDate(rec.created_at);

      // Determine the YYYY-MM-DD of this work date for range filtering
      const workD = parseLabelDateTime(rec.timestamp_label) ?? new Date(rec.created_at);
      const workYMD = toYMD(workD);
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
    const rows: {
      staff_name: string; staff_phone: string;
      date: string; entry: string; exit: string;
      hours: number | null; project: string;
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

        // Time display: extract from timestamp_label; fall back to created_at
        const entryDisplay = labelTime(firstEntry?.timestamp_label) || (firstEntry ? israelTime(firstEntry.created_at) : "—");
        const exitDisplay  = labelTime(lastExit?.timestamp_label)   || (lastExit  ? israelTime(lastExit.created_at)   : "—");

        // Hours: use parsed datetime from labels for accurate diff
        let hours: number | null = null;
        if (firstEntry && lastExit) {
          const entryDt = parseLabelDateTime(firstEntry.timestamp_label) ?? new Date(firstEntry.created_at);
          const exitDt  = parseLabelDateTime(lastExit.timestamp_label)   ?? new Date(lastExit.created_at);
          const diffMs  = exitDt.getTime() - entryDt.getTime();
          if (diffMs > 0) hours = Math.round(diffMs / 36_000) / 100; // 2-decimal hours
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
    const summaryMap = new Map<string, { name: string; phone: string; days: number; hours: number }>();
    for (const row of rows) {
      const key = row.staff_phone;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, { name: row.staff_name, phone: row.staff_phone, days: 0, hours: 0 });
      }
      const s = summaryMap.get(key)!;
      s.days++;
      if (row.hours !== null) s.hours = Math.round((s.hours + row.hours) * 100) / 100;
    }
    const summary = [...summaryMap.values()].sort((a, b) => a.name.localeCompare(b.name, "he"));

    return NextResponse.json({ rows, summary, from, to });
  } catch (fatal) {
    console.error("[attendance/report] FATAL:", fatal);
    return NextResponse.json({ error: String(fatal) }, { status: 500 });
  }
}
