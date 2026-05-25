import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isAuthedFromRequest,
  isAdminAuthedFromRequest,
  getAdminRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../lib/admin-auth";
import { normalizePhone } from "../../../../lib/phone";

export const runtime = "nodejs";

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
    // Foreman path — return only workers in their projects.
    // Was 3 sequential round-trips (projects → distinct staff_ids → staff
    // details); now 2 by joining staff↔attendance via PostgREST's inner-join
    // syntax. PostgREST deduplicates parent rows automatically.
    const staffId = getForemanStaffIdFromRequest(req);
    if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: foremanProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("foreman_id", staffId);

    const projectIds = (foremanProjects ?? []).map((p: { id: string }) => p.id);
    if (projectIds.length === 0) return NextResponse.json({ staff: [] });

    const { data, error } = await supabase
      .from("staff")
      .select("id, name, phone, role, active, pin, attendance!inner(project_id)")
      .is("deleted_at", null)
      .in("attendance.project_id", projectIds)
      .order("name", { ascending: true });

    if (error) {
      console.error("[admin/staff GET foreman]", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Strip the nested attendance array — it was only there to drive the join.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staff = (data ?? []).map(({ pin, attendance: _att, ...rest }: any) => ({
      ...rest,
      has_pin: !!pin,
    }));
    return NextResponse.json({ staff });
  }

  // Admin path — all staff (soft-deleted workers are hidden everywhere)
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, phone, role, active, national_id, hourly_rate, daily_rate, employment_type, monthly_global_salary, travel_allowance, pension_status, holiday_eligible, is_freelancer, start_date, notes, pin")
    .is("deleted_at", null)
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

  let body: {
    name?: string; phone?: string; role?: string;
    national_id?: string;
    hourly_rate?: number; daily_rate?: number;
    employment_type?: string;
    monthly_global_salary?: number;
    travel_allowance?: boolean;
    pension_status?: string;
    holiday_eligible?: boolean;
    is_freelancer?: boolean;
    start_date?: string;
    notes?: string;
    pin?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name, phone, role, national_id, hourly_rate, daily_rate,
    employment_type, monthly_global_salary, travel_allowance,
    pension_status, holiday_eligible, is_freelancer, start_date, notes, pin,
  } = body;
  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "שם וטלפון הם שדות חובה" }, { status: 400 });
  }

  const validRoles = ["עובד", "ממונה", "מנהל"];
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: "תפקיד לא תקין" }, { status: 400 });
  }

  const validEmploymentTypes = ["hourly", "daily", "global"];
  if (employment_type && !validEmploymentTypes.includes(employment_type)) {
    return NextResponse.json({ error: "סוג העסקה לא תקין" }, { status: 400 });
  }

  if (monthly_global_salary !== undefined && monthly_global_salary !== null) {
    if (typeof monthly_global_salary !== "number" || monthly_global_salary < 0) {
      return NextResponse.json({ error: "שכר גלובלי חייב להיות מספר חיובי" }, { status: 400 });
    }
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

  if (start_date !== undefined && start_date !== null && start_date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    return NextResponse.json({ error: "תאריך התחלה לא תקין (פורמט: YYYY-MM-DD)" }, { status: 400 });
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
      employment_type: employment_type ?? "hourly",
      monthly_global_salary: monthly_global_salary ?? null,
      travel_allowance: travel_allowance ?? false,
      pension_status: pension_status?.trim() || null,
      holiday_eligible: holiday_eligible ?? true,
      is_freelancer: is_freelancer ?? false,
      start_date: start_date && start_date.trim() ? start_date : null,
      notes: notes?.trim() || null,
      pin: pin?.trim() || null,
    })
    .select("id, name, phone, role, active, national_id, hourly_rate, daily_rate, employment_type, monthly_global_salary, travel_allowance, pension_status, holiday_eligible, is_freelancer, start_date, notes, pin")
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
