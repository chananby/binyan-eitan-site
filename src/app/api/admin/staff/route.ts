import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isAuthedFromRequest,
  isAdminAuthedFromRequest,
  getAdminIdFromRequest,
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

  // Admin path — all staff (soft-deleted workers are hidden everywhere).
  // bank_* columns appear ONLY in this admin-authed select; the foreman
  // path above uses a narrow select that excludes them by construction.
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, phone, role, active, national_id, hourly_rate, daily_rate, employment_type, monthly_global_salary, travel_allowance, pension_status, holiday_eligible, is_freelancer, start_date, employment_end_date, notes, attendance_exempt, bank_name, bank_branch, bank_account, bank_account_owner, bank_iban, pin")
    .is("deleted_at", null)
    .order("active", { ascending: false })
    .order("name",   { ascending: true });

  if (error) {
    console.error("[admin/staff GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Per-worker "do they have a usable rate for the current month?" flag —
  // drives the ⚠️ marker the WorkersTab paints next to workers who'd
  // produce a wrong payroll number until the admin sets a rate.
  const staffIds = (data ?? []).map((s) => s.id);
  const { getRatesForMonth, hasValidRate } = await import("../../../../lib/staff-rates");
  const currentYM = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" }).slice(0, 7);
  const ratesMap = await getRatesForMonth(supabase, staffIds, currentYM);

  const staff = (data ?? []).map(({ pin, ...rest }) => {
    const r = ratesMap.get(rest.id) ?? null;
    return {
      ...rest,
      has_pin: !!pin,
      has_rate: hasValidRate(r, rest.employment_type),
    };
  });
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
    attendance_exempt?: boolean;
    start_date?: string;
    employment_end_date?: string;
    notes?: string;
    pin?: string;
    bank_name?: string;
    bank_branch?: string;
    bank_account?: string;
    bank_account_owner?: string;
    bank_iban?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name, phone, role, national_id, hourly_rate, daily_rate,
    employment_type, monthly_global_salary, travel_allowance,
    pension_status, holiday_eligible, is_freelancer, attendance_exempt,
    start_date, employment_end_date, notes, pin,
    bank_name, bank_branch, bank_account, bank_account_owner, bank_iban,
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

  // Required-rate enforcement: a new worker must have a rate for the
  // employment_type the admin picked. The legacy staff columns are still
  // written (so old report code keeps working) but the real source of
  // truth is the staff_rates row we'll insert just below.
  const effectiveEmpType = employment_type ?? "hourly";
  const ratesForEmpType: Record<string, number | null | undefined> = {
    hourly: hourly_rate,
    daily:  daily_rate,
    global: monthly_global_salary,
  };
  const initialRate = ratesForEmpType[effectiveEmpType];
  if (!initialRate || initialRate <= 0) {
    return NextResponse.json(
      { error: `חובה להזין תעריף (${effectiveEmpType === "hourly" ? "שעתי" : effectiveEmpType === "daily" ? "יומי" : "גלובלי"}) לפני שמירה` },
      { status: 400 },
    );
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

  if (employment_end_date !== undefined && employment_end_date !== null && employment_end_date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(employment_end_date)) {
    return NextResponse.json({ error: "תאריך סיום העסקה לא תקין (פורמט: YYYY-MM-DD)" }, { status: 400 });
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
      attendance_exempt: attendance_exempt ?? false,
      start_date: start_date && start_date.trim() ? start_date : null,
      employment_end_date: employment_end_date && employment_end_date.trim() ? employment_end_date : null,
      notes: notes?.trim() || null,
      pin: pin?.trim() || null,
      // Bank details — admin-only by virtue of POST being admin-gated.
      bank_name:          bank_name?.trim()          || null,
      bank_branch:        bank_branch?.trim()        || null,
      bank_account:       bank_account?.trim()       || null,
      bank_account_owner: bank_account_owner?.trim() || null,
      bank_iban:          bank_iban?.trim()          || null,
    })
    .select("id, name, phone, role, active, national_id, hourly_rate, daily_rate, employment_type, monthly_global_salary, travel_allowance, pension_status, holiday_eligible, is_freelancer, start_date, employment_end_date, notes, attendance_exempt, bank_name, bank_branch, bank_account, bank_account_owner, bank_iban, pin")
    .single();

  if (error) {
    console.error("[admin/staff POST]", JSON.stringify(error));
    if (error.code === "23505") {
      return NextResponse.json({ error: "מספר טלפון זה כבר קיים במערכת" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Seed the worker's first staff_rates row for the current Israel-local
  // month — the per-month rate history starts from "now". We log but
  // don't fail the request on a rate-insert error; the worker exists and
  // the UI will flag them ⚠️ until the admin reopens and saves a rate.
  try {
    const todayYmd = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
    const effective_month = todayYmd.slice(0, 7) + "-01"; // YYYY-MM-01
    const adminId = getAdminIdFromRequest(req);
    let created_by = "admin:unknown";
    if (adminId) {
      const { data: adminRow } = await supabase
        .from("admins").select("name").eq("id", adminId).maybeSingle();
      created_by = adminRow?.name ? `admin:${adminRow.name}` : `admin:${adminId.slice(0, 8)}`;
    }
    await supabase.from("staff_rates").upsert({
      staff_id: data.id,
      effective_month,
      hourly_rate: hourly_rate ?? null,
      daily_rate: daily_rate ?? null,
      monthly_global_salary: monthly_global_salary ?? null,
      created_by,
    }, { onConflict: "staff_id,effective_month" });
  } catch (e) {
    console.warn("[admin/staff POST] staff_rates seed failed:", e instanceof Error ? e.message : String(e));
  }

  const { pin: _pin, ...rest } = data;
  return NextResponse.json({ staff: { ...rest, has_pin: !!_pin } }, { status: 201 });
}
