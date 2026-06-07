/**
 * /api/worker/identify — worker-portal identity session.
 *
 * Three verbs:
 *   GET     — probe: is the current request already a signed worker session?
 *             Returns { ok, staff_id, name } when yes, 401 when no.
 *   POST    — log in: take a phone number, look up an active staff row, set
 *             a signed httpOnly cookie carrying that staff_id (12h max age).
 *             Returns { ok, name } on success, 404 on no match.
 *   DELETE  — log out: clear the cookie ("החלף משתמש"). Always 200.
 *
 * Both GET and POST require the PIN cookie (verifyInternalToken) — the portal
 * is gated by a shared PIN at the layout level, and we don't want unauthed
 * traffic enumerating phones via this endpoint.
 *
 * POST is rate-limited per IP with the same window as /api/internal-auth.
 *
 * Why this exists: until now, /api/worker/history and /api/worker/manual-entry
 * trusted whatever `phone` the client sent in the body — anyone with the PIN
 * could impersonate any worker. This endpoint moves identity to a signed
 * cookie the client cannot forge.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { normalizePhone, phoneVariants } from "../../../../lib/phone";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import {
  verifyInternalToken,
  getWorkerStaffIdFromRequest,
  buildWorkerAuthCookie,
  buildWorkerClearCookie,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const INTERNAL_COOKIE = "be_internal_token";

function requirePinCookie(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(INTERNAL_COOKIE)?.value ?? "";
  if (!verifyInternalToken(token)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// ── GET — whoami probe ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const pinFail = requirePinCookie(req);
  if (pinFail) return pinFail;

  const staffId = getWorkerStaffIdFromRequest(req);
  if (!staffId) return NextResponse.json({ ok: false }, { status: 401 });

  // Surface the worker name + active state so the UI can render the greeting
  // without a separate roundtrip — but bail to 401 if the row was soft-
  // deleted / deactivated since the cookie was issued.
  const supabase = createServerClient();
  const { data } = await supabase
    .from("staff")
    .select("id, name, active")
    .eq("id", staffId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data || data.active === false) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, staff_id: data.id, name: data.name });
}

// ── POST — phone → cookie ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const pinFail = requirePinCookie(req);
  if (pinFail) return pinFail;

  // Rate-limit per IP — same posture as /api/internal-auth (5 attempts /
  // 15 min). Keyed by IP + route so a spamming worker doesn't lock the
  // shared PIN endpoint.
  const rl = checkRateLimit(`${clientIp(req)}:worker-identify`);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: { phone?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  if (!body.phone?.trim()) {
    return NextResponse.json({ ok: false, error: "phone required" }, { status: 400 });
  }

  const normalized = normalizePhone(body.phone.trim());
  const variants   = phoneVariants(normalized);

  const supabase = createServerClient();
  const { data: rows, error } = await supabase
    .from("staff")
    .select("id, name, active")
    .in("phone", variants)
    .eq("active", true)
    .is("deleted_at", null)
    .limit(1);
  if (error) {
    console.error("[worker/identify]", JSON.stringify(error));
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const worker = rows?.[0];
  if (!worker) {
    return NextResponse.json(
      { ok: false, error: "המספר לא מזוהה במערכת" },
      { status: 404 },
    );
  }

  const res = NextResponse.json({ ok: true, staff_id: worker.id, name: worker.name });
  const { name, value, options } = buildWorkerAuthCookie(worker.id);
  res.cookies.set(name, value, options);
  return res;
}

// ── DELETE — log out / החלף משתמש ───────────────────────────────────────────
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  const { name, value, options } = buildWorkerClearCookie();
  res.cookies.set(name, value, options);
  return res;
}
