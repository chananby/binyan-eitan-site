import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { Resend } from "resend";
import { createServerClient } from "../../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";

export const runtime = "nodejs";

const TOKEN_TTL_MIN = 30;
const TOKEN_BYTES   = 32; // → 64 hex chars

function siteOrigin(req: NextRequest): string {
  // Trust the request's own origin in dev; in production, hardcode binyaneitan.com
  if (process.env.NODE_ENV === "production") return "https://binyaneitan.com";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host  = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Generic success response — same shape and timing regardless of whether
// the email is registered. Prevents user enumeration.
const GENERIC_OK = NextResponse.json({
  ok: true,
  message: "אם המייל קיים במערכת, יישלח קישור איפוס למייל זה.",
});

export async function POST(req: NextRequest) {
  // First gate: per-IP. Blocks a single attacker burst.
  const rl = checkRateLimit(`${clientIp(req)}:forgot-password`);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let email: string;
  try {
    ({ email } = await req.json());
  } catch {
    return GENERIC_OK; // Never leak parse failures via different status
  }

  if (typeof email !== "string" || !email.trim()) {
    return GENERIC_OK;
  }

  const normalized = email.trim().toLowerCase();

  // Second gate: per-email. Blocks the IP-rotation pattern where an attacker
  // tries the same address from many addresses. Same generic OK response so
  // the limit doesn't leak which addresses exist.
  const emailRl = checkRateLimit(`email:${normalized}:forgot-password`);
  if (!emailRl.allowed) {
    return GENERIC_OK;
  }
  const supabase = createServerClient();

  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, name, email, active")
    .eq("email", normalized)
    .maybeSingle();

  if (error) {
    // Log but still respond generically — don't leak existence via error
    console.error("[forgot-password] lookup failed:", error.message);
    return GENERIC_OK;
  }

  if (!admin || !admin.active) {
    return GENERIC_OK;
  }

  // Generate a fresh token and store its hash
  const tokenPlain  = randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHashed = hashToken(tokenPlain);
  const expiresAt   = new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString();

  const { error: insertErr } = await supabase
    .from("password_reset_tokens")
    .insert({ admin_id: admin.id, token_hash: tokenHashed, expires_at: expiresAt });

  if (insertErr) {
    console.error("[forgot-password] token insert failed:", insertErr.message);
    return GENERIC_OK;
  }

  // Send the email. Failures don't change the response — the admin can
  // request again, and we don't want to leak existence via error code.
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("[forgot-password] RESEND_API_KEY or EMAIL_FROM not configured");
    return GENERIC_OK;
  }

  const resetUrl = `${siteOrigin(req)}/admin/reset-password?token=${tokenPlain}`;
  const body =
    `שלום ${admin.name},\n\n` +
    `קיבלנו בקשה לאיפוס סיסמת מנהל ראשי בחשבון שלך.\n\n` +
    `לחץ/י על הקישור כדי להגדיר סיסמה חדשה (תקף ${TOKEN_TTL_MIN} דקות):\n` +
    `${resetUrl}\n\n` +
    `אם לא ביקשת זאת, אפשר להתעלם מהמייל הזה.\n\n` +
    `— Binyan Eitan`;

  try {
    const resend = new Resend(apiKey);
    const { error: sendErr } = await resend.emails.send({
      from,
      to: admin.email,
      subject: "איפוס סיסמה — Binyan Eitan Admin",
      text: body,
    });
    if (sendErr) {
      console.error("[forgot-password] resend send failed:", sendErr.message ?? sendErr);
    }
  } catch (e) {
    console.error("[forgot-password] resend threw:", e instanceof Error ? e.message : String(e));
  }

  return GENERIC_OK;
}
