import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { getAdminIdFromRequest, getForemanStaffIdFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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
      .maybeSingle();

    if (data) {
      return NextResponse.json({ role: "foreman", staffId: data.id, name: data.name });
    }
    // Token valid but staff not found / deactivated — deny
    return NextResponse.json({ role: null });
  }

  return NextResponse.json({ role: null });
}
