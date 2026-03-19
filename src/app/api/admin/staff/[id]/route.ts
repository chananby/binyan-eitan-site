import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

// PATCH — toggle active OR full edit (name, phone, role, national_id)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { active?: boolean; name?: string; phone?: string; role?: string; national_id?: string; hourly_rate?: number | null; daily_rate?: number | null };
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

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff")
    .update(update)
    .eq("id", params.id)
    .select("id, name, phone, role, active, national_id, hourly_rate, daily_rate")
    .single();

  if (error) {
    console.error("[admin/staff PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ staff: data });
}

// DELETE — hard delete (only if no attendance records linked)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Check for linked attendance records first
  const { count } = await supabase
    .from("attendance")
    .select("*", { count: "exact", head: true })
    .eq("staff_id", params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `לא ניתן למחוק — קיימות ${count} רשומות נוכחות. השתמש בהשבתה במקום.` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("[admin/staff DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
