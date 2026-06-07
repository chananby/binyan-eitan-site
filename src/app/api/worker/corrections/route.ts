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

  let body: { attendance_id?: string; proposed_time?: string; reason?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const attendance_id = body.attendance_id?.trim();
  const reason        = body.reason?.trim();
  const proposed_time = body.proposed_time?.trim() || null;

  if (!attendance_id) {
    return NextResponse.json({ error: "attendance_id חובה" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "סיבה חובה" }, { status: 400 });
  }
  if (proposed_time && !/^\d{2}:\d{2}$/.test(proposed_time)) {
    return NextResponse.json({ error: "פורמט שעה לא תקין (HH:MM)" }, { status: 400 });
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
    .insert({ attendance_id, staff_id: staffId, proposed_time, reason })
    .select("id, status")
    .single();
  if (insertErr) {
    console.error("[worker/corrections] insert:", JSON.stringify(insertErr));
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, correction: created });
}
