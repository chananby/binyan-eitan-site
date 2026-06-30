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
 * Phone identification is the only worker-portal auth — the shared-PIN
 * gate (be_internal_token) that used to wrap this route was removed
 * because crew friction outweighed the enumeration deterrent it
 * provided. Phone lookups are still rate-limited per IP (5/15min), so
 * the attack surface is "guess one phone every three minutes" instead
 * of the realtime fan-out without a limit.
 *
 * Why this exists: history and manual-entry both trust the signed
 * staff_id cookie this route issues, not the phone in the body — the
 * caller can't forge a session for someone else's phone.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { normalizePhone, phoneVariants } from "../../../../lib/phone";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import {
  getWorkerStaffIdFromRequest,
  buildWorkerAuthCookie,
  buildWorkerClearCookie,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// ── GET — whoami probe ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const staffId = getWorkerStaffIdFromRequest(req);
  if (!staffId) return NextResponse.json({ ok: false }, { status: 401 });

  // Surface the worker name + active state so the UI can render the greeting
  // without a separate roundtrip — but bail to 401 if the row was soft-
  // deleted / deactivated since the cookie was issued.
  const supabase = createServerClient();
  const { data } = await supabase
    .from("staff")
    .select("id, name, active, language")
    .eq("id", staffId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data || data.active === false) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({
    ok: true, staff_id: data.id, name: data.name, language: data.language,
  });
}

// ── POST — phone → cookie ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate-limit per IP — 5 attempts / 15 min. This is now the *only*
  // enumeration deterrent on the route; tightening it would be the
  // first lever to pull if abuse appears.
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
    .select("id, name, active, language")
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

  const res = NextResponse.json({
    ok: true, staff_id: worker.id, name: worker.name, language: worker.language,
  });
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
