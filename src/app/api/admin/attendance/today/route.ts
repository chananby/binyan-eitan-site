import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // "Today" = from midnight UTC. Israel is UTC+2/+3 so near-midnight edge cases
  // are acceptable for a construction site attendance system.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("attendance")
    .select("id, action, lat, lng, timestamp_label, recorded_at, staff:staff_id(id, name, phone)")
    .gte("recorded_at", todayStart.toISOString())
    .order("recorded_at", { ascending: false });

  if (error) {
    // "timestamp_label" column might not exist — retry without it
    if (error.code === "42703") {
      const { data: fallback, error: fallbackError } = await supabase
        .from("attendance")
        .select("id, action, lat, lng, recorded_at, staff:staff_id(id, name, phone)")
        .gte("recorded_at", todayStart.toISOString())
        .order("recorded_at", { ascending: false });

      if (fallbackError) {
        console.error("[admin/attendance/today fallback]", JSON.stringify(fallbackError));
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
      return NextResponse.json({ records: fallback ?? [] });
    }

    console.error("[admin/attendance/today]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data ?? [] });
}
