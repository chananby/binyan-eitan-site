import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isAdminAuthedFromRequest,
  getAdminIdFromRequest,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// GET /api/admin/vacation?staff_id=...&month=YYYY-MM
// Lists vacation days. Both filters optional but typically used together.
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staff_id");
  const month   = searchParams.get("month"); // "YYYY-MM"
  const limit   = Math.min(parseInt(searchParams.get("limit") || "500", 10), 1000);
  const offset  = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("vacation_days")
    .select("id, staff_id, date, half_day, notes, created_at, staff:staff_id(id, name)")
    .order("date", { ascending: true })
    .range(offset, offset + limit - 1);

  if (staffId) query = query.eq("staff_id", staffId);
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const start = `${month}-01`;
    // end = first of next month, exclusive
    const [yStr, mStr] = month.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const nextMonth = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    query = query.gte("date", start).lt("date", nextMonth);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/vacation GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ records: data ?? [] });
}

// POST { staff_id, date, half_day?, notes? }
// Adds a vacation day. UNIQUE(staff_id, date) prevents duplicates.
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { staff_id?: string; date?: string; half_day?: boolean; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.staff_id || !body.date) {
    return NextResponse.json({ error: "חסר staff_id או date" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: "פורמט תאריך לא תקין (צריך YYYY-MM-DD)" }, { status: 400 });
  }

  const adminId = getAdminIdFromRequest(req);
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("vacation_days")
    .insert({
      staff_id: body.staff_id,
      date: body.date,
      half_day: !!body.half_day,
      notes: body.notes?.trim() || null,
      created_by: adminId,
    })
    .select("id, staff_id, date, half_day, notes, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "יום החופשה הזה כבר רשום לעובד" }, { status: 409 });
    }
    console.error("[admin/vacation POST]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ record: data }, { status: 201 });
}
