import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("attendance")
    .select("id, action, lat, lng, timestamp_label, recorded_at, project_id, staff:staff_id(id, name, phone, role), project:project_id(id, name)")
    .gte("recorded_at", todayStart.toISOString())
    .order("recorded_at", { ascending: false });

  if (error) {
    // Graceful fallback: retry without new columns if they don't exist yet (code 42703)
    if (error.code === "42703") {
      const { data: fallback, error: fallbackError } = await supabase
        .from("attendance")
        .select("id, action, lat, lng, recorded_at, staff:staff_id(id, name, phone, role)")
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
