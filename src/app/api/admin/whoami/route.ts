import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { getAdminIdFromRequest, getForemanStaffIdFromRequest, getViewContext } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // View-as-foreman takes precedence: an admin viewing a foreman should see the
  // portal exactly as that foreman does, so report the VIEWED identity plus a
  // viewAs marker that drives the yellow banner. Falls through to normal admin
  // if the viewed foreman was deactivated/removed mid-view.
  const view = getViewContext(req);
  if (view) {
    const supabase = createServerClient();
    const [{ data: admin }, { data: foreman }] = await Promise.all([
      supabase.from("admins").select("name").eq("id", view.adminId).maybeSingle(),
      supabase.from("staff").select("id, name").eq("id", view.staffId)
        .eq("role", "ממונה").eq("active", true).is("deleted_at", null).maybeSingle(),
    ]);
    if (foreman) {
      return NextResponse.json({
        role: "foreman",
        staffId: foreman.id,
        name: foreman.name,
        viewAs: { adminName: admin?.name ?? null, viewedName: foreman.name },
      });
    }
  }

  // Admin — look up identity from DB so the client can render
  // "logged in as <name>" and rehydrate after a page refresh
  const adminId = getAdminIdFromRequest(req);
  if (adminId) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("admins")
      .select("id, email, name, active")
      .eq("id", adminId)
      .maybeSingle();
    if (data && data.active) {
      return NextResponse.json({ role: "admin", adminId: data.id, email: data.email, name: data.name });
    }
    // Token valid but admin not found / deactivated — deny
    return NextResponse.json({ role: null });
  }

  // Foreman — look up name from DB
  const staffId = getForemanStaffIdFromRequest(req);
  if (staffId) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("staff")
      .select("id, name, role")
      .eq("id", staffId)
      .eq("role", "ממונה")
      .eq("active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (data) {
      return NextResponse.json({ role: "foreman", staffId: data.id, name: data.name });
    }
    // Token valid but staff not found / deactivated — deny
    return NextResponse.json({ role: null });
  }

  return NextResponse.json({ role: null });
}
