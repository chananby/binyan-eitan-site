import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

// GET — list all staff
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, phone, role, active")
    .order("active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/staff GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ staff: data ?? [] });
}

// POST — add new worker
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; phone?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, phone, role } = body;
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

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("staff")
    .insert({ name: name.trim(), phone: normalizedPhone, role: role ?? "עובד", active: true })
    .select("id, name, phone, role, active")
    .single();

  if (error) {
    console.error("[admin/staff POST]", JSON.stringify(error));
    if (error.code === "23505") {
      return NextResponse.json({ error: "מספר טלפון זה כבר קיים במערכת" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data }, { status: 201 });
}
