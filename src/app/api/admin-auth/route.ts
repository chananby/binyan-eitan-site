import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { buildAuthCookie, buildClearCookie } from "../../../lib/admin-auth";
import { createServerClient } from "../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../lib/rate-limit";

export const runtime = "nodejs";

// Burned-CPU dummy hash for timing-attack defence when the email
// doesn't exist. bcrypt.compare against this still takes ~same time
// as a real comparison, so we don't leak existence via response time.
// Generated from bcrypt.hash("dummy", 10) — value doesn't matter.
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

// POST — verify email + password against admins table, set auth cookie
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`${clientIp(req)}:admin-auth`);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let email: string, password: string;
  try {
    ({ email, password } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    // Still consume bcrypt time so an attacker can't distinguish
    // "missing field" from "wrong credentials" by latency
    await bcrypt.compare("dummy", DUMMY_HASH);
    return NextResponse.json({ ok: false, error: "wrong_credentials" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, name, password_hash, active")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("[admin-auth] db lookup failed:", error.message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  // Generic error path — runs bcrypt against dummy hash to equalise timing
  if (!admin || !admin.active) {
    await bcrypt.compare(password, DUMMY_HASH);
    return NextResponse.json({ ok: false, error: "wrong_credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "wrong_credentials" }, { status: 401 });
  }

  // Update last_login_at — await so it runs inside the function's lifetime,
  // but a failure here shouldn't block login
  try {
    const { error: updErr } = await supabase
      .from("admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", admin.id);
    if (updErr) console.error("[admin-auth] last_login_at update failed:", updErr.message);
  } catch (e) {
    console.error("[admin-auth] last_login_at update threw:", e);
  }

  const { name: cookieName, value, options } = buildAuthCookie(admin.id);
  const res = NextResponse.json({ ok: true, name: admin.name });
  res.cookies.set(cookieName, value, options);
  return res;
}

// DELETE — logout (clear cookie)
export async function DELETE() {
  const { name, value, options } = buildClearCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, options);
  return res;
}
