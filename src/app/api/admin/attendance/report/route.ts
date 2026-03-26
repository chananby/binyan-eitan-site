/**
 * GET /api/admin/attendance/report?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns a structured weekly attendance report:
 *   rows[]    — one row per worker per day (entry, exit, hours, project)
 *   summary[] — one row per worker (total days, total hours)
 *
 * Dates are interpreted in Israel time (Asia/Jerusalem).
 * Defaults to the last 7 days when no params are supplied.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// ── Helpers ───────────────────────────────────────────────────────────────────

function israelDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day:   "2-digit",
    month: "2-digit",
    year:  "numeric",
  });
}

function israelTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Convert a "YYYY-MM-DD" string to start-of-day ISO in Israel time
function dayStartISO(ymd: string): string {
  // e.g. "2025-03-20" → "2025-03-20T00:00:00" treated as Israel midnight
  // We approximate by converting to UTC using a fixed +03:00 offset.
  // Daylight-saving shifts are handled by the display formatter; the boundary
  // is only ever off by ≤1 hour which is acceptable for a daily report.
  return new Date(`${ymd}T00:00:00+03:00`).toISOString();
}
function dayEndISO(ymd: string): string {
  return new Date(`${ymd}T23:59:59+03:00`).toISOString();
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    if (!isAdminAuthedFromRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const today = new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" }); // YYYY-MM-DD
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

    const { data, error } = await supabase
      .from("attendance")
      .select("id, action, timestamp_label, created_at, staff:staff_id(id, name, phone), project:project_id(name)")
      .gte("created_at", dayStartISO(from))
      .lte("created_at", dayEndISO(to))
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Group: staffId → dateStr → { entries[], exits[], projects[] } ─────────
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
      const dateStr = israelDate(rec.created_at);

      if (!grouped.has(staffId)) grouped.set(staffId, new Map());
      const byDate = grouped.get(staffId)!;

      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, { entries: [], exits: [], staffName, staffPhone, projects: [] });
      }
      const day = byDate.get(dateStr)!;

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
      // Sort dates ascending
      const sortedDates = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      for (const [dateStr, day] of sortedDates) {
        const firstEntry = day.entries[0] ?? null;
        const lastExit   = day.exits[day.exits.length - 1] ?? null;

        const entryDisplay = firstEntry?.timestamp_label
          ? firstEntry.timestamp_label.slice(0, 5)
          : firstEntry ? israelTime(firstEntry.created_at) : "—";
        const exitDisplay  = lastExit?.timestamp_label
          ? lastExit.timestamp_label.slice(0, 5)
          : lastExit  ? israelTime(lastExit.created_at)   : "—";

        let hours: number | null = null;
        if (firstEntry && lastExit) {
          const diffMs = new Date(lastExit.created_at).getTime() - new Date(firstEntry.created_at).getTime();
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
    rows.sort((a, b) => a.staff_name.localeCompare(b.staff_name, "he") || a.date.localeCompare(b.date));

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
