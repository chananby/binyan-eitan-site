import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { createServerClient } from "../../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";

export const runtime = "nodejs";

const MIN_LENGTH  = 8;
const SALT_ROUNDS = 10;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// POST { token, newPassword }
// Consumes a one-time reset token (sha256-hashed in DB) and writes
// a fresh bcrypt hash for the associated admin. Invalidates the token.
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`${clientIp(req)}:reset-password`);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let token: string, newPassword: string;
  try {
    ({ token, newPassword } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (typeof token !== "string" || typeof newPassword !== "string" || !token || !newPassword) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json(
      { ok: false, error: "password_too_short", min: MIN_LENGTH },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const tokenHashed = hashToken(token);

  const { data: row, error: lookupErr } = await supabase
    .from("password_reset_tokens")
    .select("id, admin_id, expires_at, used_at")
    .eq("token_hash", tokenHashed)
    .maybeSingle();

  if (lookupErr) {
    console.error("[reset-password] lookup failed:", lookupErr.message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }
  if (row.used_at) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password and mark token used. We do these as two writes;
  // if the second fails, the password is already changed but the token
  // could be reused — so we mark used FIRST, then update the password.
  const { error: useErr } = await supabase
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null); // atomic guard against double-use race
  if (useErr) {
    console.error("[reset-password] mark used failed:", useErr.message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  const { error: updateErr } = await supabase
    .from("admins")
    .update({ password_hash: newHash })
    .eq("id", row.admin_id);
  if (updateErr) {
    console.error("[reset-password] password update failed:", updateErr.message);
    // Revert used_at so the user can retry without requesting a fresh token.
    // Best-effort: if the revert itself fails, the token is dead and the user
    // must request a new one — but the password is still unchanged either way.
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: null })
      .eq("id", row.id);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
