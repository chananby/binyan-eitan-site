import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { getAdminRoleFromRequest, getForemanStaffIdFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Admin
  if (getAdminRoleFromRequest(req)) {
    return NextResponse.json({ role: "admin" });
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
