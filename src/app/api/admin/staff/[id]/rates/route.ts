/**
 * /api/admin/staff/[id]/rates
 *   GET   — full rate history (newest first) for one worker.
 *   POST  — add or update the rate for a specific effective month.
 *
 * Admin only. The route never touches staff.{hourly_rate,daily_rate,
 * monthly_global_salary}; those columns are kept untouched as a legacy
 * fallback when no staff_rates row exists at all.
 *
 * UPSERT semantics: POSTing twice for the same effective_month overwrites
 * the values of that month (so the admin can correct a typo without
 * having to delete the row first). created_by is updated on overwrite
 * too — the audit-trail then reflects the *current* author.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import {
  isAdminAuthedFromRequest,
  getAdminIdFromRequest,
} from "../../../../../../lib/admin-auth";

export const runtime = "nodejs";

async function resolveAdminLabel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  adminId: string,
): Promise<string> {
  try {
    const { data } = await supabase.from("admins").select("name").eq("id", adminId).maybeSingle();
    return data?.name ? `admin:${data.name}` : `admin:${adminId.slice(0, 8)}`;
  } catch {
    return `admin:${adminId.slice(0, 8)}`;
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = await props.params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff_rates")
    .select("id, effective_month, hourly_rate, daily_rate, monthly_global_salary, created_by, created_at")
    .eq("staff_id", params.id)
    .order("effective_month", { ascending: false });
  if (error) {
    console.error("[admin/staff/rates GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rates: data ?? [] });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = await props.params;

  let body: {
    effective_month?: string;          // "YYYY-MM-01" or "YYYY-MM"
    hourly_rate?: number | null;
    daily_rate?: number | null;
    monthly_global_salary?: number | null;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Accept "YYYY-MM" as a convenience and normalise to "YYYY-MM-01".
  let effective_month = (body.effective_month ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(effective_month))         effective_month += "-01";
  if (!/^\d{4}-\d{2}-01$/.test(effective_month)) {
    return NextResponse.json(
      { error: 'effective_month חייב להיות בפורמט "YYYY-MM" או "YYYY-MM-01"' },
      { status: 400 },
    );
  }

  // Require at least one rate; otherwise the row is pointless.
  const hourly = body.hourly_rate         == null ? null : Number(body.hourly_rate);
  const daily  = body.daily_rate          == null ? null : Number(body.daily_rate);
  const global = body.monthly_global_salary == null ? null : Number(body.monthly_global_salary);
  if ((hourly ?? 0) <= 0 && (daily ?? 0) <= 0 && (global ?? 0) <= 0) {
    return NextResponse.json(
      { error: "יש למלא לפחות תעריף אחד חיובי (שעתי / יומי / גלובלי)" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Confirm the worker exists (and isn't deleted) before opening up a
  // foreign-key insert path. Also surfaces a friendlier error than a
  // raw FK violation.
  const { data: worker } = await supabase
    .from("staff")
    .select("id")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!worker) {
    return NextResponse.json({ error: "עובד לא נמצא" }, { status: 404 });
  }

  const adminId = getAdminIdFromRequest(req)!;
  const created_by = await resolveAdminLabel(supabase, adminId);

  // Upsert on (staff_id, effective_month). Same month → overwrite.
  const { data, error } = await supabase
    .from("staff_rates")
    .upsert({
      staff_id: params.id,
      effective_month,
      hourly_rate: hourly,
      daily_rate:  daily,
      monthly_global_salary: global,
      created_by,
    }, { onConflict: "staff_id,effective_month" })
    .select("id, effective_month, hourly_rate, daily_rate, monthly_global_salary, created_by, created_at")
    .single();

  if (error) {
    console.error("[admin/staff/rates POST]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rate: data });
}
