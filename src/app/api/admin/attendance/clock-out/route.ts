import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAuthedFromRequest } from "../../../../../lib/admin-auth";
import { israelWallClockToISO } from "../../../../../lib/israel-time";

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
  const { error } = await supabase
    .from("attendance")
    .insert({
      staff_id,
      action:          "out",
      timestamp_label,
      clock_at:        clockAtIso,
      project_id:      project_id || null,
      source:          "manual",
      // lat/lng intentionally omitted — manual clock-out has no GPS
    });

  if (error) {
    console.error("[attendance/clock-out]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
