import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// POST — manually clock out a worker (foreman or admin).
// Creates a new "out" attendance record for the given staff member.
export async function POST(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { staff_id?: string; project_id?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { staff_id, project_id } = body;
  if (!staff_id) {
    return NextResponse.json({ error: "staff_id חובה" }, { status: 400 });
  }

  const now = new Date();
  const timestamp_label = now.toLocaleString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const supabase = createServerClient();
  const { error } = await supabase
    .from("attendance")
    .insert({
      staff_id,
      action:          "out",
      timestamp_label,
      clock_at:        now.toISOString(),
      project_id:      project_id || null,
      // lat/lng intentionally omitted — manual clock-out has no GPS
    });

  if (error) {
    console.error("[attendance/clock-out]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
