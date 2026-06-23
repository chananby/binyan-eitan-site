import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest, getAdminIdFromRequest } from "../../../../../lib/admin-auth";
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
    office_only?: boolean;
    attendance_exempt?: boolean;
    start_date?: string | null;
    employment_end_date?: string | null;
    notes?: string | null;
    pin?: string | null;
    bank_name?: string | null;
    bank_branch?: string | null;
    bank_account?: string | null;
    bank_account_owner?: string | null;
    bank_iban?: string | null;
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
  if (body.office_only !== undefined) update.office_only = !!body.office_only;
  if (body.attendance_exempt !== undefined) update.attendance_exempt = !!body.attendance_exempt;
  if (body.start_date !== undefined) {
    const sd = body.start_date;
    if (sd && sd !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(sd)) {
      return NextResponse.json({ error: "תאריך התחלה לא תקין (פורמט: YYYY-MM-DD)" }, { status: 400 });
    }
    update.start_date = sd && sd !== "" ? sd : null;
  }
  if (body.employment_end_date !== undefined) {
    const ed = body.employment_end_date;
    if (ed && ed !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(ed)) {
      return NextResponse.json({ error: "תאריך סיום העסקה לא תקין (פורמט: YYYY-MM-DD)" }, { status: 400 });
    }
    update.employment_end_date = ed && ed !== "" ? ed : null;
  }
  // Bank details — admin-only by virtue of this route being admin-gated.
  // Empty strings are normalised to NULL so DB rows stay clean.
  if (body.bank_name          !== undefined) update.bank_name          = body.bank_name?.trim()          || null;
  if (body.bank_branch        !== undefined) update.bank_branch        = body.bank_branch?.trim()        || null;
  if (body.bank_account       !== undefined) update.bank_account       = body.bank_account?.trim()       || null;
  if (body.bank_account_owner !== undefined) update.bank_account_owner = body.bank_account_owner?.trim() || null;
  if (body.bank_iban          !== undefined) update.bank_iban          = body.bank_iban?.trim()          || null;
  if (body.notes !== undefined) {
    update.notes = body.notes?.trim() || null;
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
    .select("id, name, phone, role, active, national_id, hourly_rate, daily_rate, employment_type, monthly_global_salary, travel_allowance, pension_status, holiday_eligible, is_freelancer, office_only, start_date, employment_end_date, notes, attendance_exempt, bank_name, bank_branch, bank_account, bank_account_owner, bank_iban, pin")
    .single();

  if (error) {
    console.error("[admin/staff PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mirror rate changes into the per-month rate history. Until now the
  // edit-worker form's "שכר שעתי/יומי/גלובלי" inputs wrote *only* to the
  // legacy staff.{hourly_rate,daily_rate,monthly_global_salary} columns —
  // staff_rates stayed untouched, so payroll's has_rate check (which reads
  // only staff_rates) kept flagging ⚠️ even after a save. We now upsert a
  // staff_rates row for the current Israel-calendar month whenever any
  // rate column was sent in the body, mirroring the POST flow's seed step.
  // Legacy columns are still written above as a defensive fallback so old
  // code paths that read staff.*_rate keep working.
  const rateTouched = body.hourly_rate !== undefined
                   || body.daily_rate  !== undefined
                   || body.monthly_global_salary !== undefined;
  if (rateTouched) {
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
      // Use the resulting staff row's values (not the request body) so any
      // field the body omitted gets the current persisted value rather than
      // a null override that would wipe an existing rate channel.
      await supabase.from("staff_rates").upsert({
        staff_id: params.id,
        effective_month,
        hourly_rate: data.hourly_rate ?? null,
        daily_rate:  data.daily_rate  ?? null,
        monthly_global_salary: data.monthly_global_salary ?? null,
        created_by,
      }, { onConflict: "staff_id,effective_month" });
    } catch (e) {
      console.warn("[admin/staff PATCH] staff_rates mirror failed:", e instanceof Error ? e.message : String(e));
    }
  }

  // office_only=true → purge any existing board_assignments for this
  // worker. Without this, the staff row drops out of the board GET's
  // workers list but its assignment row stays — BoardTab then renders
  // an orphaned chip with label "—" (looks like an empty card) in
  // whatever column the worker had been placed in. Same DELETE pattern
  // as PUT /api/admin/board-assignments uses for "unassign".
  //
  // Best-effort: if the staff UPDATE succeeded but the purge fails, we
  // log loudly and still return success — the admin's primary action
  // (mark as office-only) went through; the stale rows can be cleaned
  // up by the admin re-saving or by a one-off SQL.
  if (body.office_only === true) {
    const { error: purgeErr } = await supabase
      .from("board_assignments")
      .delete()
      .eq("worker_id", params.id);
    if (purgeErr) {
      console.error(
        "[admin/staff PATCH] office_only purge failed for staff_id=" + params.id + ":",
        JSON.stringify(purgeErr),
      );
    }
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
