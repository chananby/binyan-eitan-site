import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// GET — returns all manual attendance records pending admin approval
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("id, action, timestamp_label, created_at, is_manual, status, staff:staff_id(id, name, phone), project:project_id(id, name)")
    .eq("status", "pending")
    .eq("is_manual", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/attendance/pending]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data ?? [] });
}
