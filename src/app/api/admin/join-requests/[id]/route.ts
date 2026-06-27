/**
 * POST /api/admin/join-requests/[id] — admin action on a single join
 * request. Discriminated by `action`:
 *
 *   { action: "reject", rejection_note?: string }
 *     UPDATE join_requests SET status='rejected', rejection_note=…,
 *     reviewed_at=NOW() WHERE id=:id AND status='pending'.
 *     The status='pending' guard makes this idempotent — a second click
 *     from a sibling tab returns 409, not a silent overwrite.
 *
 *   { action: "link", staff_id: string }
 *     UPDATE join_requests SET status='approved', staff_id=:staff_id,
 *     reviewed_at=NOW() WHERE id=:id AND status='pending'.
 *     CRUCIAL: this route DOES NOT create the staff row. The admin
 *     creates the worker via the existing POST /api/admin/staff (so
 *     all the rate/employment-type validation runs), then this route
 *     just records the linkage. Splitting it this way avoids
 *     duplicating worker-creation logic and keeps the rate-enforcement
 *     guarantee from /api/admin/staff intact.
 *
 * Admin only. service_role.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

type RejectBody = { action: "reject"; rejection_note?: string };
type LinkBody   = { action: "link";   staff_id: string };
type Body = RejectBody | LinkBody;

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  if (!isNonEmpty(id)) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: Body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = createServerClient();
  const reviewed_at = new Date().toISOString();

  if (body.action === "reject") {
    const note = isNonEmpty(body.rejection_note) ? body.rejection_note.trim() : null;
    const { data, error } = await supabase
      .from("join_requests")
      .update({ status: "rejected", rejection_note: note, reviewed_at })
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[admin/join-requests reject]", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      // No row hit either because the id is gone or because the
      // request is no longer pending (a sibling tab already acted).
      return NextResponse.json({ error: "הבקשה כבר טופלה או לא נמצאה" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "link") {
    if (!isNonEmpty(body.staff_id)) {
      return NextResponse.json({ error: "staff_id required" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("join_requests")
      .update({ status: "approved", staff_id: body.staff_id.trim(), reviewed_at })
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[admin/join-requests link]", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "הבקשה כבר טופלה או לא נמצאה" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
