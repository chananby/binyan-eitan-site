import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { normalizePhone } from "../../../../../lib/phone";

export const runtime = "nodejs";

// PATCH — toggle active OR full edit (name, phone, role, national_id)
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    active?: boolean; name?: string; phone?: string; role?: string;
    national_id?: string;
    hourly_rate?: number | null; daily_rate?: number | null;
    employment_type?: string;
    monthly_global_salary?: number | null;
    travel_allowance?: boolean;
    pension_status?: string | null;
    holiday_eligible?: boolean;
    is_freelancer?: boolean;
    start_date?: string | null;
    pin?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.active === "boolean") {
    update.active = body.active;
  }
  if (body.name !== undefined) {
    if (!body.name.trim()) return NextResponse.json({ error: "שם לא יכול להיות ריק" }, { status: 400 });
    update.name = body.name.trim();
  }
  if (body.phone !== undefined) {
    const normalized = normalizePhone(body.phone);
    if (normalized.length < 9) return NextResponse.json({ error: "מספר טלפון לא תקין" }, { status: 400 });
    update.phone = normalized;
  }
  if (body.role !== undefined) {
    const validRoles = ["עובד", "ממונה", "מנהל"];
    if (!validRoles.includes(body.role)) return NextResponse.json({ error: "תפקיד לא תקין" }, { status: 400 });
    update.role = body.role;
  }
  if (body.national_id !== undefined) {
    const id = body.national_id.trim();
    if (id && !/^\d+$/.test(id)) return NextResponse.json({ error: "מספר ת\"ז חייב להכיל ספרות בלבד" }, { status: 400 });
    update.national_id = id || null;
  }

  if (body.hourly_rate !== undefined) update.hourly_rate = body.hourly_rate ?? null;
  if (body.daily_rate  !== undefined) update.daily_rate  = body.daily_rate  ?? null;

  if (body.employment_type !== undefined) {
    const validTypes = ["hourly", "daily", "global"];
    if (!validTypes.includes(body.employment_type)) {
      return NextResponse.json({ error: "סוג העסקה לא תקין" }, { status: 400 });
    }
    update.employment_type = body.employment_type;
  }
  if (body.monthly_global_salary !== undefined) {
    if (body.monthly_global_salary !== null) {
      if (typeof body.monthly_global_salary !== "number" || body.monthly_global_salary < 0) {
        return NextResponse.json({ error: "שכר גלובלי חייב להיות מספר חיובי" }, { status: 400 });
      }
    }
    update.monthly_global_salary = body.monthly_global_salary;
  }
  if (body.travel_allowance !== undefined) update.travel_allowance = !!body.travel_allowance;
  if (body.pension_status !== undefined) {
    update.pension_status = body.pension_status?.trim() || null;
  }
  if (body.holiday_eligible !== undefined) update.holiday_eligible = !!body.holiday_eligible;
  if (body.is_freelancer !== undefined) update.is_freelancer = !!body.is_freelancer;
  if (body.start_date !== undefined) {
    const sd = body.start_date;
    if (sd && sd !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(sd)) {
      return NextResponse.json({ error: "תאריך התחלה לא תקין (פורמט: YYYY-MM-DD)" }, { status: 400 });
    }
    update.start_date = sd && sd !== "" ? sd : null;
  }

  if (body.pin !== undefined) {
    if (body.pin && !/^\d{4,8}$/.test(body.pin.trim())) {
      return NextResponse.json({ error: "PIN חייב להיות 4–8 ספרות" }, { status: 400 });
    }
    update.pin = body.pin?.trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff")
    .update(update)
    .eq("id", params.id)
    .select("id, name, phone, role, active, national_id, hourly_rate, daily_rate, employment_type, monthly_global_salary, travel_allowance, pension_status, holiday_eligible, is_freelancer, start_date, pin")
    .single();

  if (error) {
    console.error("[admin/staff PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { pin: _pin, ...rest } = data;
  return NextResponse.json({ staff: { ...rest, has_pin: !!_pin } });
}

// DELETE — soft delete. Sets deleted_at = NOW().
// Contract: only inactive workers (active = false) can be deleted. The UI
// enforces this by exposing the delete button only inside the inactive
// accordion, but we double-check here so the API is safe on its own.
// Attendance rows are intentionally preserved for historical payroll.
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Verify the worker exists, is not already deleted, and is inactive.
  const { data: existing, error: fetchErr } = await supabase
    .from("staff")
    .select("id, active, deleted_at")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[admin/staff DELETE fetch]", JSON.stringify(fetchErr));
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!existing || existing.deleted_at) {
    return NextResponse.json({ error: "העובד לא נמצא" }, { status: 404 });
  }
  if (existing.active) {
    return NextResponse.json(
      { error: "ניתן למחוק רק עובד מושבת. יש להשבית את העובד תחילה." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("staff")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    console.error("[admin/staff DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
