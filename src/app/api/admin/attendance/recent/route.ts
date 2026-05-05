import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// GET — returns raw attendance records from the last N days (default 7, max 30)
// Admin only; used by the retroactive-edit panel in AdminPortal
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "7", 10) || 7, 1), 30);

  const supabase = createServerClient();
  const sinceYMD = new Date(Date.now() - (days - 1) * 86_400_000)
    .toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
  const fromISO = new Date(`${sinceYMD}T00:00:00+03:00`).toISOString();

  const { data, error } = await supabase
    .from("attendance")
    .select("id, action, timestamp_label, clock_at, created_at, is_manual, status, staff:staff_id(id, name, phone, role), project:project_id(id, name)")
    .gte("created_at", fromISO)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/attendance/recent]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data ?? [] });
}
