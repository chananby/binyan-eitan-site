import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isAuthedFromRequest,
  isAdminAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

// GET — list staff
// Admin: all staff
// Foreman: only workers who have attendance records in their projects
export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const isAdmin = getAdminRoleFromRequest(req) === "admin";

  if (!isAdmin) {
    // Foreman path — return only workers in their projects
    const staffId = getForemanStaffIdFromRequest(req);
    if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: foremanProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("foreman_id", staffId);

    const projectIds = (foremanProjects ?? []).map((p: { id: string }) => p.id);
    if (projectIds.length === 0) return NextResponse.json({ staff: [] });

    // Get distinct worker IDs from attendance in those projects
    const { data: attRecords } = await supabase
      .from("attendance")
      .select("staff_id")
      .in("project_id", projectIds);

    const workerIds = [...new Set((attRecords ?? []).map((r: { staff_id: string }) => r.staff_id))];
    if (workerIds.length === 0) return NextResponse.json({ staff: [] });

    const { data, error } = await supabase
      .from("staff")
      .select("id, name, phone, role, active, pin")
      .in("id", workerIds)
      .order("name", { ascending: true });

    if (error) {
      console.error("[admin/staff GET foreman]", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const staff = (data ?? []).map(({ pin, ...rest }) => ({ ...rest, has_pin: !!pin }));
    return NextResponse.json({ staff });
  }

  // Admin path — all staff
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, phone, role, active, national_id, hourly_rate, daily_rate, pin")
    .order("active", { ascending: false })
    .order("name",   { ascending: true });

  if (error) {
    console.error("[admin/staff GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const staff = (data ?? []).map(({ pin, ...rest }) => ({ ...rest, has_pin: !!pin }));
  return NextResponse.json({ staff });
}

// POST — add new worker (admin only)
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; phone?: string; role?: string; national_id?: string; hourly_rate?: number; daily_rate?: number; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, phone, role, national_id, hourly_rate, daily_rate, pin } = body;
  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "שם וטלפון הם שדות חובה" }, { status: 400 });
  }

  const validRoles = ["עובד", "ממונה", "מנהל"];
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: "תפקיד לא תקין" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 9) {
    return NextResponse.json({ error: "מספר טלפון לא תקין" }, { status: 400 });
  }

  if (national_id && !/^\d+$/.test(national_id.trim())) {
    return NextResponse.json({ error: "מספר ת\"ז חייב להכיל ספרות בלבד" }, { status: 400 });
  }

  if (pin && !/^\d{4,8}$/.test(pin.trim())) {
    return NextResponse.json({ error: "PIN חייב להיות 4–8 ספרות" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff")
    .insert({
      name: name.trim(),
      phone: normalizedPhone,
      role: role ?? "עובד",
      active: true,
      national_id: national_id?.trim() || null,
      hourly_rate: hourly_rate ?? null,
      daily_rate: daily_rate ?? null,
      pin: pin?.trim() || null,
    })
    .select("id, name, phone, role, active, national_id, hourly_rate, daily_rate, pin")
    .single();

  if (error) {
    console.error("[admin/staff POST]", JSON.stringify(error));
    if (error.code === "23505") {
      return NextResponse.json({ error: "מספר טלפון זה כבר קיים במערכת" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { pin: _pin, ...rest } = data;
  return NextResponse.json({ staff: { ...rest, has_pin: !!_pin } }, { status: 201 });
}
