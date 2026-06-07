/**
 * PATCH /api/admin/attendance/corrections/[id]
 *
 * Approve or reject a worker-submitted correction request.
 *
 *   Approve: marks the correction approved AND, if the worker supplied a
 *            proposed_time, rewrites the underlying attendance row's
 *            timestamp_label + clock_at — with the full audit trail
 *            (original_clock_at on first edit, edited_by, edited_at,
 *            edit_note carrying the worker's reason).
 *   Reject:  marks the correction rejected only; the attendance row is
 *            left as it was.
 *
 * Admin only — foreman can't approve corrections (yet). Same retro-window
 * gate as the admin PATCH on the attendance row itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import {
  isAdminAuthedFromRequest,
  getAdminIdFromRequest,
} from "../../../../../../lib/admin-auth";
import { israelWallClockToISO } from "../../../../../../lib/israel-time";

export const runtime = "nodejs";

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

async function resolveAdminLabel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  adminId: string,
): Promise<string> {
  try {
    const { data } = await supabase.from("admins").select("name").eq("id", adminId).maybeSingle();
    return data?.name ? `admin:${data.name}` : `admin:${adminId.slice(0, 8)}`;
  } catch {
    return `admin:${adminId.slice(0, 8)}`;
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "אישור/דחיה זמינים לאדמין בלבד" }, { status: 403 });
  }

  let body: { status?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json({ error: "status חייב להיות approved או rejected" }, { status: 400 });
  }
  const decision = body.status as "approved" | "rejected";

  const supabase = createServerClient();

  // Fetch the correction with its underlying attendance row (we'll need
  // clock_at for the retro window check + original_clock_at logic).
  const { data: corr, error: corrErr } = await supabase
    .from("attendance_corrections")
    .select(`
      id, attendance_id, staff_id, proposed_time, reason, status,
      attendance:attendance_id ( id, clock_at, created_at, original_clock_at, deleted_at )
    `)
    .eq("id", params.id)
    .maybeSingle();
  if (corrErr) {
    console.error("[admin/attendance/corrections PATCH] fetch:", JSON.stringify(corrErr));
    return NextResponse.json({ error: corrErr.message }, { status: 500 });
  }
  if (!corr) return NextResponse.json({ error: "בקשה לא נמצאה" }, { status: 404 });
  if (corr.status !== "pending") {
    return NextResponse.json({ error: "הבקשה כבר טופלה" }, { status: 409 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const att = (corr as any).attendance as
    | { id: string; clock_at: string | null; created_at: string; original_clock_at: string | null; deleted_at: string | null }
    | null;
  if (!att) return NextResponse.json({ error: "רשומה לא נמצאה" }, { status: 404 });
  if (att.deleted_at) {
    return NextResponse.json({ error: "הרשומה נמחקה" }, { status: 410 });
  }
  if (!isWithinRetroWindow(att.clock_at ?? att.created_at)) {
    return NextResponse.json(
      { error: "ניתן לאשר רק בקשות לרשומות מהחודש הנוכחי או הקודם" },
      { status: 403 },
    );
  }

  const adminId  = getAdminIdFromRequest(req)!;
  const editor   = await resolveAdminLabel(supabase, adminId);
  const nowIso   = new Date().toISOString();

  // ── Apply the decision to the attendance row when approving + proposed_time ──
  if (decision === "approved" && corr.proposed_time) {
    // Use the attendance row's existing YMD (in Israel TZ) + the proposed
    // HH:MM. This preserves the calendar day; the worker can only fix the
    // *time*, not move the entry to a different day (a different bug class).
    const baseIso = att.clock_at ?? att.created_at;
    const ymd = new Date(baseIso)
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
    const hm  = corr.proposed_time;
    let newClockAt: string;
    try { newClockAt = israelWallClockToISO(ymd, hm); }
    catch {
      return NextResponse.json({ error: "השעה המוצעת לא תקינה" }, { status: 400 });
    }

    // Build "DD.M.YYYY, HH:MM" — the same display format used elsewhere.
    const [y, m, d] = ymd.split("-");
    const newLabel = `${parseInt(d)}.${parseInt(m)}.${y}, ${hm}`;

    const update: Record<string, unknown> = {
      clock_at:        newClockAt,
      timestamp_label: newLabel,
      edited_by:       editor,
      edited_at:       nowIso,
      edit_note:       `תיקון לפי בקשת עובד: ${corr.reason}`,
    };
    if (att.original_clock_at === null && att.clock_at !== null) {
      update.original_clock_at = att.clock_at;
    }

    const { error: updErr } = await supabase
      .from("attendance")
      .update(update)
      .eq("id", att.id);
    if (updErr) {
      console.error("[admin/attendance/corrections] att update:", JSON.stringify(updErr));
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  }

  // Mark the correction request resolved either way.
  const { error: corrUpdErr } = await supabase
    .from("attendance_corrections")
    .update({
      status:      decision,
      resolved_by: editor,
      resolved_at: nowIso,
    })
    .eq("id", params.id);
  if (corrUpdErr) {
    console.error("[admin/attendance/corrections] corr update:", JSON.stringify(corrUpdErr));
    return NextResponse.json({ error: corrUpdErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: decision });
}
