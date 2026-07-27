import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAuthedFromRequest } from "../../../../../lib/admin-auth";
import { israelDayStartISO, israelWallClockToISO } from "../../../../../lib/israel-time";
import { hasOpenRecord } from "../../../../../lib/attendance-logic";
import { resolveActorLabel } from "../../../../../lib/audit-actor";

export const runtime = "nodejs";

// POST — manually clock out a worker (foreman or admin).
// Creates a new "out" attendance record for the given staff member.
//
// Body:
//   staff_id    required
//   project_id  optional
//   date        optional YYYY-MM-DD — when present + time, used for a
//               past-day "complete the missing exit" flow from the worker
//               history panel. Defaults to today.
//   time        optional HH:MM — paired with `date` to set a specific
//               wall-clock exit time in Israel TZ. When omitted, the
//               exit is recorded at the current moment (legacy behavior).
export async function POST(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { staff_id?: string; project_id?: string; date?: string; time?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { staff_id, project_id, date, time } = body;
  if (!staff_id) {
    return NextResponse.json({ error: "staff_id חובה" }, { status: 400 });
  }

  // Either both date+time are provided (custom timestamp), or neither (now).
  // Mixing them would be ambiguous — fail loud rather than guessing.
  if ((date && !time) || (!date && time)) {
    return NextResponse.json({ error: "יש לספק גם תאריך וגם שעה, או אף אחד מהם" }, { status: 400 });
  }

  let clockAtIso: string;
  let timestamp_label: string;
  if (date && time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: "פורמט תאריך/שעה לא תקין" }, { status: 400 });
    }
    try {
      clockAtIso = israelWallClockToISO(date, time);
    } catch {
      return NextResponse.json({ error: "תאריך/שעה לא תקינים" }, { status: 400 });
    }
    // "DD.MM.YYYY, HH:MM" — same format the AttendanceTab edit form parses
    const [y, m, d] = date.split("-");
    timestamp_label = `${parseInt(d)}.${parseInt(m)}.${y}, ${time}`;
  } else {
    const now = new Date();
    clockAtIso = now.toISOString();
    timestamp_label = now.toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const supabase = createServerClient();

  // ── Guard against orphan-exit inserts ──────────────────────────────
  // Without this check the endpoint would happily create an OUT for a
  // day that has no matching IN (or where the IN was already closed by
  // an earlier OUT). Result: a "-8h" phantom shift in the monthly
  // report and a payroll mistake nobody would catch until reconciliation.
  //
  // Scope by the DAY the exit is targeting (the resolved clock_at's
  // Israel-local YMD), not by a rolling window: the caller has already
  // told us which day this exit belongs to (either explicit date+time
  // for retro completion or the current wall clock). Answering "is
  // there an open IN on that day?" is a direct question with no
  // TZ-edge ambiguity.
  const targetYmd = new Date(clockAtIso)
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const dayStartISO = israelDayStartISO(targetYmd);
  const nextYmd = new Date(new Date(`${targetYmd}T12:00:00Z`).getTime() + 86_400_000)
    .toISOString().slice(0, 10);
  const nextDayStartISO = israelDayStartISO(nextYmd);
  const { data: dayRows } = await supabase
    .from("attendance")
    .select("action, clock_at")
    .is("deleted_at", null)
    .eq("staff_id", staff_id)
    .in("action", ["in", "כניסה", "out", "יציאה"])
    .gte("clock_at", dayStartISO)
    .lt("clock_at", nextDayStartISO);
  if (!hasOpenRecord(dayRows ?? [], dayStartISO)) {
    return NextResponse.json(
      {
        error: "no_open_entry_to_close",
        message: "אין כניסה פתוחה לסגירה ביום זה. בדוק את היום או השתמש ב'הוסף יום'.",
      },
      { status: 409 },
    );
  }

  // Audit trail — resolveActorLabel handles admin/view-as/foreman uniformly.
  // Previously omitted here, so a chnn-initiated clock-out left no
  // "מי הזין" fingerprint in the row.
  const editedBy = await resolveActorLabel(supabase, req);

  const { error } = await supabase
    .from("attendance")
    .insert({
      staff_id,
      action:          "out",
      timestamp_label,
      clock_at:        clockAtIso,
      project_id:      project_id || null,
      source:          "manual",
      // Explicit — an admin "complete exit" is approved immediately (same
      // value the DB default gives); written so the row is correct even if
      // that default is ever dropped (see 20260727_attendance_status_default.sql).
      status:          "approved",
      edited_by:       editedBy,
      edited_at:       new Date().toISOString(),
      // lat/lng intentionally omitted — manual clock-out has no GPS
      // is_manual not set — legacy behaviour of this endpoint. Distinct
      // from /admin/attendance/manual, which flags is_manual=true.
      // Scope-safe: unrelated to the audit-trail fix in this branch.
    });

  if (error) {
    console.error("[attendance/clock-out]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
