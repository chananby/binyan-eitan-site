/**
 * /api/admin/impersonate — admin "view-as-foreman" (read-only).
 *
 *   POST { staff_id }  — start viewing as the given foreman. Validates the
 *                        target is an active ממונה, then sets be_view_token
 *                        bound to the acting admin. The admin's own session
 *                        cookie is untouched, so exiting is instant.
 *   DELETE             — stop viewing (clears be_view_token).
 *   GET                — current view state for the banner.
 *
 * Authorized by the RAW admin id (getAdminIdFromRequest), NOT
 * isAdminAuthedFromRequest — the latter is intentionally false while a view is
 * active, but the acting admin must still be able to query/exit the view.
 * One-directional by construction: only admin → foreman, never the reverse.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  getAdminIdFromRequest,
  getViewContext,
  buildViewAuthCookie,
  buildViewClearCookie,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const adminId = getAdminIdFromRequest(req);
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { staff_id?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const staffId = body.staff_id?.trim();
  if (!staffId) {
    return NextResponse.json({ error: "staff_id נדרש" }, { status: 400 });
  }

  // Only an active foreman (ממונה) can be viewed.
  const supabase = createServerClient();
  const { data: foreman } = await supabase
    .from("staff")
    .select("id, name")
    .eq("id", staffId)
    .eq("role", "ממונה")
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!foreman) {
    return NextResponse.json({ error: "מנהל עבודה לא נמצא או אינו פעיל" }, { status: 404 });
  }

  const { name, value, options } = buildViewAuthCookie(adminId, foreman.id);
  const res = NextResponse.json({ ok: true, name: foreman.name });
  res.cookies.set(name, value, options);
  return res;
}

export async function DELETE(req: NextRequest) {
  // Allow the acting admin to exit. (No-op for anyone without a real admin
  // session — there's nothing to exit.)
  if (!getAdminIdFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, value, options } = buildViewClearCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, options);
  return res;
}

export async function GET(req: NextRequest) {
  const view = getViewContext(req);
  if (!view) return NextResponse.json({ active: false });

  const supabase = createServerClient();
  const [{ data: admin }, { data: foreman }] = await Promise.all([
    supabase.from("admins").select("name").eq("id", view.adminId).maybeSingle(),
    supabase.from("staff").select("name").eq("id", view.staffId).maybeSingle(),
  ]);

  return NextResponse.json({
    active: true,
    adminName: admin?.name ?? null,
    viewedName: foreman?.name ?? null,
    staffId: view.staffId,
  });
}
