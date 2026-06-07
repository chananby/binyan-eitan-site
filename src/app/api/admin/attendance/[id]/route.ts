import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { israelWallClockToISO } from "../../../../../lib/israel-time";
import {
  isAdminAuthedFromRequest,
  isAuthedFromRequest,
  getRoleFromRequest,
  getAdminIdFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// ── Retro-edit window ─────────────────────────────────────────────────────────
// Both admins and foremen may only edit/delete attendance whose work day
// falls in the *current* or *immediately previous* Israel-calendar month.
// Anything older is closed for retroactive correction — push back to the
// office / accountant instead. The check is server-side so a tampered
// client can't bypass it.
function isWithinRetroWindow(recordIso: string | null): boolean {
  if (!recordIso) return true; // no clock_at => fall through (extremely rare, treat as editable)
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

// Friendly Hebrew 403 for out-of-window writes.
function retroWindowBlocked() {
  return NextResponse.json(
    { error: "ניתן לערוך או למחוק רק רשומות מהחודש הנוכחי או הקודם. לתיקון רטרואקטיבי ישן יותר — פנו להנהלת החשבונות." },
    { status: 403 },
  );
}

// Resolve a human-readable label for the editor — "admin:<name>" / "foreman:<name>".
// One extra round-trip per write; attendance edits are infrequent so the cost
// is invisible. Returns null if the lookup fails — caller still proceeds, just
// without the audit name (better than refusing the edit over an audit gap).
async function resolveEditorLabel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  role: "admin" | "foreman",
  id: string,
): Promise<string> {
  try {
    if (role === "admin") {
      const { data } = await supabase.from("admins").select("name").eq("id", id).maybeSingle();
      return data?.name ? `admin:${data.name}` : `admin:${id.slice(0, 8)}`;
    }
    const { data } = await supabase.from("staff").select("name").eq("id", id).maybeSingle();
    return data?.name ? `foreman:${data.name}` : `foreman:${id.slice(0, 8)}`;
  } catch {
    return `${role}:${id.slice(0, 8)}`;
  }
}

interface AttendanceSnapshot {
  id: string;
  project_id: string | null;
  clock_at: string | null;
  created_at: string;
  original_clock_at: string | null;
  deleted_at: string | null;
}

// PATCH — retroactive edit of an attendance record.
// Admin: edit action / project_id / timestamp_label / status, with audit + retro guard.
// Foreman: edit action / project_id / timestamp_label / status on records in their projects,
// with the same audit + retro guard.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; project_id?: string | null; timestamp_label?: string; status?: string; edit_note?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const role = getRoleFromRequest(req);
  const supabase = createServerClient();

  // ── Fetch the snapshot once — covers project ownership check, retro
  // window check, original_clock_at backfill decision, and "is it deleted?" check.
  const { data: snap, error: snapErr } = await supabase
    .from("attendance")
    .select("id, project_id, clock_at, created_at, original_clock_at, deleted_at")
    .eq("id", params.id)
    .maybeSingle<AttendanceSnapshot>();
  if (snapErr) return NextResponse.json({ error: snapErr.message }, { status: 500 });
  if (!snap) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  if (snap.deleted_at) {
    return NextResponse.json({ error: "הרשומה נמחקה ולא ניתן לערוך אותה" }, { status: 410 });
  }
  if (!isWithinRetroWindow(snap.clock_at ?? snap.created_at)) {
    return retroWindowBlocked();
  }

  // ── Foreman scope: must own the record's project ──────────────────────────
  if (role === "foreman") {
    const staffId = getForemanStaffIdFromRequest(req);
    if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!snap.project_id) {
      return NextResponse.json({ error: "אין פרויקט משויך לרשומה" }, { status: 403 });
    }
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("foreman_id")
      .eq("id", snap.project_id)
      .maybeSingle();
    if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });
    if (!project || project.foreman_id !== staffId) {
      return NextResponse.json({ error: "אין הרשאה לרשומה הזו" }, { status: 403 });
    }
  } else if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Build the update set ──────────────────────────────────────────────────
  const update: Record<string, unknown> = {};
  let clockAtChanging = false;

  if (body.action !== undefined) {
    if (!["כניסה", "יציאה", "in", "out"].includes(body.action)) {
      return NextResponse.json({ error: "פעולה לא תקינה" }, { status: 400 });
    }
    update.action = body.action;
  }
  if (body.project_id !== undefined) update.project_id = body.project_id || null;

  if (body.timestamp_label !== undefined) {
    const trimmed = body.timestamp_label?.trim() || null;
    update.timestamp_label = trimmed;
    if (trimmed) {
      const parts = trimmed.replace(",", "").trim().split(/\s+/);
      if (parts.length >= 2) {
        const [d2, m2, y2] = parts[0].split(".");
        const [hh, mm]     = parts[1].split(":");
        if (d2 && m2 && y2 && hh && mm) {
          const ymd = `${y2}-${m2.padStart(2,"0")}-${d2.padStart(2,"0")}`;
          const hm  = `${hh.padStart(2,"0")}:${mm.padStart(2,"0")}`;
          try {
            const newClockAt = israelWallClockToISO(ymd, hm);
            update.clock_at = newClockAt;
            clockAtChanging = newClockAt !== snap.clock_at;
          } catch { /* invalid date — skip clock_at update, keep label */ }
        }
      }
    } else {
      update.clock_at = null;
      clockAtChanging = snap.clock_at !== null;
    }
  }

  if (body.status !== undefined) {
    if (!["approved", "rejected", "pending"].includes(body.status)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (!Object.keys(update).length) return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });

  // ── Audit trail ───────────────────────────────────────────────────────────
  // Preserve the as-clocked truth on the FIRST clock_at change only — later
  // edits keep pointing at the very first value the worker (or auto-system) set.
  if (clockAtChanging && snap.original_clock_at === null && snap.clock_at !== null) {
    update.original_clock_at = snap.clock_at;
  }
  const editorId = role === "admin"
    ? getAdminIdFromRequest(req)!
    : getForemanStaffIdFromRequest(req)!;
  update.edited_by = await resolveEditorLabel(supabase, role as "admin" | "foreman", editorId);
  update.edited_at = new Date().toISOString();
  if (body.edit_note !== undefined) {
    const note = body.edit_note?.trim() || null;
    update.edit_note = note;
  }

  const { data, error } = await supabase
    .from("attendance")
    .update(update)
    .eq("id", params.id)
    .select("id, action, timestamp_label, clock_at, original_clock_at, recorded_at, project_id, status, edited_by, edited_at, edit_note")
    .single();

  if (error) {
    console.error("[admin/attendance PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ record: data });
}

// DELETE — soft delete of an attendance record. Admin only.
//
// Hard delete is intentionally never available: payroll archives and
// foreman dashboards may need to reference the row historically (or to
// undo a mistaken delete). The row is marked deleted_at=NOW() and every
// downstream read filters `deleted_at IS NULL`. The same retro window
// that gates edits gates deletes.
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "מחיקה זמינה לאדמין בלבד" }, { status: 403 });
  }

  let edit_note: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.edit_note === "string") edit_note = body.edit_note.trim() || null;
  } catch { /* no body / empty body is fine */ }

  const supabase = createServerClient();

  const { data: snap, error: snapErr } = await supabase
    .from("attendance")
    .select("id, clock_at, created_at, deleted_at")
    .eq("id", params.id)
    .maybeSingle();
  if (snapErr) return NextResponse.json({ error: snapErr.message }, { status: 500 });
  if (!snap) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  if (snap.deleted_at) {
    return NextResponse.json({ error: "הרשומה כבר נמחקה" }, { status: 410 });
  }
  if (!isWithinRetroWindow(snap.clock_at ?? snap.created_at)) {
    return retroWindowBlocked();
  }

  const adminId = getAdminIdFromRequest(req)!;
  const editor = await resolveEditorLabel(supabase, "admin", adminId);

  const { error } = await supabase
    .from("attendance")
    .update({
      deleted_at: new Date().toISOString(),
      edited_by:  editor,
      edited_at:  new Date().toISOString(),
      ...(edit_note !== null ? { edit_note } : {}),
    })
    .eq("id", params.id);

  if (error) {
    console.error("[admin/attendance DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
