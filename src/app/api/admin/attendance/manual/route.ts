import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import {
  isAdminAuthedFromRequest,
  getRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";
import { israelWallClockToISO } from "../../../../../lib/israel-time";
import { planManualWorkRows } from "../../../../../lib/attendance-logic";

export const runtime = "nodejs";

// Work types require entry+exit; absence types create a single marker record
type EntryType = "regular" | "overtime" | "vacation" | "sick" | "other";
const ABSENCE_ACTION: Record<string, string> = { vacation: "חופש", sick: "מחלה", other: "אחר" };

export async function POST(req: NextRequest) {
  // Auth: admin (as before) OR foreman scoped to their own project.
  // Foreman entries land as status='pending' so an admin still reviews
  // before the hours reach payroll — different from admin's direct
  // status='approved'. Anyone else → 401.
  const role = getRoleFromRequest(req);
  const isAdmin   = isAdminAuthedFromRequest(req);
  const isForeman = !isAdmin && role === "foreman";
  if (!isAdmin && !isForeman) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const supabase = createServerClient();

  // Foreman gate: project_id is REQUIRED and must belong to the caller.
  // This is the whole substance of the foreman path — without it, a
  // foreman could insert rows attributed to any project. Admin path
  // has no such restriction (admin can enter for any worker, any project).
  let editedBy: string | null = null;
  if (isForeman) {
    const foremanStaffId = getForemanStaffIdFromRequest(req);
    if (!foremanStaffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!project_id?.trim()) {
      return NextResponse.json({ error: "מנהל עבודה חייב לבחור פרויקט" }, { status: 400 });
    }
    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .select("foreman_id")
      .eq("id", project_id)
      .maybeSingle();
    if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });
    if (!proj || proj.foreman_id !== foremanStaffId) {
      return NextResponse.json({ error: "אין הרשאה לפרויקט הזה" }, { status: 403 });
    }
    // Audit trail: the row was created by this foreman. The pending
    // admin panel reads edited_by to show "מי הזין" alongside the row.
    const { data: fm } = await supabase
      .from("staff")
      .select("name")
      .eq("id", foremanStaffId)
      .maybeSingle();
    editedBy = `foreman:${fm?.name ?? foremanStaffId.slice(0, 8)}`;
  }

  // Format matching parseLabelDateTime: "D.M.YYYY, HH:MM"
  const [y, m, d] = date.split("-");
  const dp = `${parseInt(d)}.${parseInt(m)}.${y}`;

  const base = (action: string, label: string, clockAt: string | null): Record<string, unknown> => ({
    staff_id,
    action,
    timestamp_label: label,
    clock_at: clockAt,
    is_manual: true,
    // Foreman entries stay pending until the admin reviews (same review
    // pipeline the worker manual-entry flow used to feed). Admin's own
    // entries continue to land directly as approved — they've already
    // reviewed by the act of typing.
    status: isForeman ? "pending" : "approved",
    source: "manual",
    lat: null,
    lng: null,
    ...(editedBy   ? { edited_by: editedBy, edited_at: new Date().toISOString() } : {}),
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

  const { error } = await supabase.from("attendance").insert(records);
  if (error) {
    console.error("[admin/attendance/manual]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: records.length });
}
