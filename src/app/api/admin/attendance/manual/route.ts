import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { israelWallClockToISO } from "../../../../../lib/israel-time";
import { planManualWorkRows } from "../../../../../lib/attendance-logic";

export const runtime = "nodejs";

// Work types require entry+exit; absence types create a single marker record
type EntryType = "regular" | "overtime" | "vacation" | "sick" | "other";
const ABSENCE_ACTION: Record<string, string> = { vacation: "חופש", sick: "מחלה", other: "אחר" };

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    staff_id?: string;
    date?: string;       // YYYY-MM-DD
    type?: EntryType;
    entry_time?: string; // HH:MM
    exit_time?: string;  // HH:MM
    project_id?: string;
    notes?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { staff_id, date, type = "regular", entry_time, exit_time, project_id, notes } = body;

  if (!staff_id?.trim())               return NextResponse.json({ error: "staff_id נדרש" }, { status: 400 });
  if (!date?.match(/^\d{4}-\d{2}-\d{2}$/)) return NextResponse.json({ error: "date לא תקין" }, { status: 400 });
  if (!["regular","overtime","vacation","sick","other"].includes(type))
    return NextResponse.json({ error: "type לא תקין" }, { status: 400 });

  const isWork = type === "regular" || type === "overtime";
  // Entry is required for a work record. Exit is OPTIONAL: an entry-only save
  // creates a legitimate OPEN record (mid-day clock-in) that gets its exit
  // added later — the same shape the live web/IVR flow produces.
  if (isWork && !entry_time) return NextResponse.json({ error: "זמן כניסה נדרש" }, { status: 400 });

  // Format matching parseLabelDateTime: "D.M.YYYY, HH:MM"
  const [y, m, d] = date.split("-");
  const dp = `${parseInt(d)}.${parseInt(m)}.${y}`;

  const base = (action: string, label: string, clockAt: string | null): Record<string, unknown> => ({
    staff_id,
    action,
    timestamp_label: label,
    clock_at: clockAt,
    is_manual: true,
    status: "approved",
    source: "manual",
    lat: null,
    lng: null,
    ...(project_id?.trim() ? { project_id } : {}),
  });

  // Work entry: one row per planned action (entry always; exit only when an
  // exit time was supplied → entry-only leaves an open record). Absence: a
  // single marker row.
  const records: Record<string, unknown>[] = isWork
    ? planManualWorkRows(entry_time!, exit_time).map((r) =>
        base(r.action, `${dp}, ${r.time}`, israelWallClockToISO(date, r.time)))
    : [
        base(
          ABSENCE_ACTION[type] ?? "אחר",
          notes?.trim() ? `${dp} — ${notes.trim()}` : dp,
          null,
        ),
      ];

  const supabase = createServerClient();
  const { error } = await supabase.from("attendance").insert(records);
  if (error) {
    console.error("[admin/attendance/manual]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: records.length });
}
