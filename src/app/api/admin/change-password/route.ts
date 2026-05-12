import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerClient } from "../../../../lib/supabase";
import { getAdminIdFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const MIN_LENGTH = 8;
const SALT_ROUNDS = 10;

// POST { currentPassword, newPassword }
// Verifies currentPassword against the logged-in admin's stored hash,
// then writes a fresh bcrypt hash of newPassword.
export async function POST(req: NextRequest) {
  const adminId = getAdminIdFromRequest(req);
  if (!adminId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let currentPassword: string, newPassword: string;
  try {
    ({ currentPassword, newPassword } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "password_too_short", min: MIN_LENGTH },
      { status: 400 },
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ ok: false, error: "same_password" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: admin, error: lookupErr } = await supabase
    .from("admins")
    .select("id, password_hash, active")
    .eq("id", adminId)
    .maybeSingle();

  if (lookupErr) {
    console.error("[change-password] lookup failed:", lookupErr.message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
  if (!admin || !admin.active) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ok = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "wrong_current_password" }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const { error: updateErr } = await supabase
    .from("admins")
    .update({ password_hash: newHash })
    .eq("id", admin.id);

  if (updateErr) {
    console.error("[change-password] update failed:", updateErr.message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
