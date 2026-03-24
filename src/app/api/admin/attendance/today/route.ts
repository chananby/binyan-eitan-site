import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();

  // Use Israel timezone to determine start of today
  const nowIsrael   = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const todayStr    = nowIsrael.split(" ")[0]; // "YYYY-MM-DD"
  const todayStart  = new Date(`${todayStr}T00:00:00+03:00`).toISOString();

  // Attendance rows are timestamped by Supabase's auto-generated created_at (not recorded_at)
  const { data, error } = await supabase
    .from("attendance")
    .select("id, action, lat, lng, timestamp_label, project_id, created_at, staff:staff_id(id, name, phone, role), project:project_id(id, name)")
    .gte("created_at", todayStart)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/attendance/today]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data ?? [] });
}
