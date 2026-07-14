/**
 * POST /api/worker/corrections — flag an attendance row as wrong.
 *
 * The worker tells us:
 *   - which row of theirs is incorrect (attendance_id)
 *   - what they think the correct time should be (proposed_time, optional)
 *   - why (reason, required)
 *
 * Identity comes from the signed worker cookie — no phone in body. We
 * defensively verify the attendance row actually belongs to the calling
 * worker, isn't already deleted, falls in the same current/previous Israel
 * month retro window the admin uses, and has no other pending correction
 * already attached (one open request at a time per row).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { getWorkerStaffIdFromRequest } from "../../../../lib/admin-auth";
import { checkRateLimit } from "../../../../lib/rate-limit";
import { isEntry, isExit } from "../../../../lib/attendance-time";
import { israelDayStartISO } from "../../../../lib/israel-time";

const REQUEST_TYPES = ["fix_time", "missing_exit", "missing_entry"] as const;
type RequestType = (typeof REQUEST_TYPES)[number];

export const runtime = "nodejs";

// Same Israel-calendar retro window the admin PATCH/DELETE routes enforce.
function isWithinRetroWindow(recordIso: string | null): boolean {
  if (!recordIso) return true;
  const recordYM = new Date(recordIso)
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" })
    .slice(0, 7);
  const nowYM = new Date()
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" })
    .slice(0, 7);
  const [y, m] = nowYM.split("-").map(Number);
  const prevYM = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  return recordYM === nowYM || recordYM === prevYM;
}

// GET — how many correction requests this worker has already filed in the
// current Israel calendar month (all statuses). Drives the "this is your Nth
// request this month" awareness message on the form. Never blocks.
export async function GET(req: NextRequest) {
  const staffId = getWorkerStaffIdFromRequest(req);
  if (!staffId) {
    return NextResponse.json({ error: "יש להזדהות מחדש" }, { status: 401 });
  }
  const nowYmd = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const monthPrefix = nowYmd.slice(0, 7);
  const [yy, mm] = monthPrefix.split("-").map(Number);
  const nextMonthYmd = mm === 12 ? `${yy + 1}-01-01` : `${yy}-${String(mm + 1).padStart(2, "0")}-01`;
  const supabase = createServerClient();
  const { count } = await supabase
    .from("attendance_corrections")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", staffId)
    .gte("created_at", israelDayStartISO(`${monthPrefix}-01`))
    .lt("created_at", israelDayStartISO(nextMonthYmd));
  return NextResponse.json({ month_count: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const staffId = getWorkerStaffIdFromRequest(req);
  if (!staffId) {
    return NextResponse.json({ error: "יש להזדהות מחדש" }, { status: 401 });
  }

  // Cap per worker — a stuck client shouldn't flood the admin with dupe
  // requests. 15/15min matches the other authenticated worker endpoints.
  const rl = checkRateLimit(`staff:${staffId}:worker-corrections`, 15);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: { attendance_id?: string; proposed_time?: string; reason?: string; request_type?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const attendance_id = body.attendance_id?.trim();
  // Reason is now OPTIONAL — the structured request_type carries the intent.
  // Stored as "" (the column is NOT NULL) when the worker leaves it blank.
  const reason        = body.reason?.trim() || "";
  const proposed_time = body.proposed_time?.trim() || null;
  // Default 'fix_time' keeps pre-structured clients working.
  const request_type  = (body.request_type ?? "fix_time") as RequestType;

  if (!attendance_id) {
    return NextResponse.json({ error: "attendance_id חובה" }, { status: 400 });
  }
  if (!REQUEST_TYPES.includes(request_type)) {
    return NextResponse.json({ error: "request_type לא תקין" }, { status: 400 });
  }
  if (proposed_time && !/^\d{2}:\d{2}$/.test(proposed_time)) {
    return NextResponse.json({ error: "פורמט שעה לא תקין (HH:MM)" }, { status: 400 });
  }
  // The "missing" types create a NEW row, so the time is required — without it
  // the admin has nothing to stamp the new entry/exit with.
  if ((request_type === "missing_exit" || request_type === "missing_entry") && !proposed_time) {
    return NextResponse.json({ error: "זמן נדרש", code: "time_required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: row, error: rowErr } = await supabase
    .from("attendance")
    .select("id, staff_id, clock_at, created_at, deleted_at")
    .eq("id", attendance_id)
    .maybeSingle();
  if (rowErr) {
    console.error("[worker/corrections] attendance fetch:", JSON.stringify(rowErr));
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }
  if (!row) return NextResponse.json({ error: "רשומה לא נמצאה" }, { status: 404 });
  if (row.staff_id !== staffId) {
    // Don't leak that the row exists — same 404 the worker sees for non-existent.
    return NextResponse.json({ error: "רשומה לא נמצאה" }, { status: 404 });
  }
  if (row.deleted_at) {
    return NextResponse.json({ error: "הרשומה נמחקה" }, { status: 410 });
  }
  if (!isWithinRetroWindow(row.clock_at ?? row.created_at)) {
    return NextResponse.json(
      { error: "ניתן לדווח על טעות רק לרשומות מהחודש הנוכחי או הקודם" },
      { status: 403 },
    );
  }

  // Day-state guard for the "missing" types: don't ask to ADD a record that
  // already exists. Scoped to the same Israel-local day as the flagged row.
  if (request_type === "missing_exit" || request_type === "missing_entry") {
    const baseIso = row.clock_at ?? row.created_at;
    const ymd = new Date(baseIso).toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
    const nextYmd = new Date(new Date(`${ymd}T12:00:00Z`).getTime() + 86_400_000)
      .toISOString().slice(0, 10);
    const { data: dayRows } = await supabase
      .from("attendance")
      .select("action")
      .is("deleted_at", null)
      .eq("staff_id", staffId)
      .gte("clock_at", israelDayStartISO(ymd))
      .lt("clock_at", israelDayStartISO(nextYmd));
    const rows = (dayRows ?? []) as { action: string }[];
    if (request_type === "missing_exit" && rows.some((r) => isExit(r.action))) {
      return NextResponse.json({ error: "כבר רשומה יציאה ליום זה", code: "day_has_exit" }, { status: 409 });
    }
    if (request_type === "missing_entry" && rows.some((r) => isEntry(r.action))) {
      return NextResponse.json({ error: "כבר רשומה כניסה ליום זה", code: "day_has_entry" }, { status: 409 });
    }
  }

  // One pending request at a time per row — second attempt while the admin
  // is still reviewing is a 409 conflict so the UI can show a clear message.
  const { data: existing } = await supabase
    .from("attendance_corrections")
    .select("id")
    .eq("attendance_id", attendance_id)
    .eq("status", "pending")
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "כבר נשלחה בקשת תיקון לרשומה זו, ממתינה לאישור" },
      { status: 409 },
    );
  }

  const { data: created, error: insertErr } = await supabase
    .from("attendance_corrections")
    .insert({ attendance_id, staff_id: staffId, proposed_time, reason, request_type })
    .select("id, status")
    .single();
  if (insertErr) {
    console.error("[worker/corrections] insert:", JSON.stringify(insertErr));
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, correction: created });
}
