/**
 * Shared helpers for the Twilio voice IVR endpoints.
 *
 *   /api/twilio/voice          — caller-ID lookup + Gather for IN/OUT
 *   /api/twilio/voice/action   — DTMF handler, project picker / single-project shortcut
 *   /api/twilio/voice/project  — DTMF for project number, attendance insert
 *
 * Each endpoint is a stateless TwiML responder. State carried between hops
 * lives in the Gather action URL's query string (staffId, action, projectIds),
 * which is included in Twilio's HMAC signature so it can't be forged.
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

// ── TwiML helpers ──────────────────────────────────────────────────────────

/** Wrap a TwiML body in the standard XML envelope + UTF-8 headers. */
export function twimlResponse(body: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`;
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Hebrew TTS via Google Cloud — free on every Twilio account, no add-on.
 *  See the long comment in voice/route.ts for the reasoning behind this
 *  pick over Polly.Carmit (retired) and Polly.Carmit-Neural (needs add-on). */
export function say(text: string): string {
  return `<Say voice="Google.he-IL-Standard-A">${escapeXml(text)}</Say>`;
}

/** Wrap a single Say in a <Gather> for DTMF input. */
export function gatherDigits(opts: {
  actionUrl: string;
  prompt: string;
  numDigits?: number;
  timeoutSec?: number;
}): string {
  const num = opts.numDigits ?? 1;
  const to = opts.timeoutSec ?? 8;
  return (
    `<Gather numDigits="${num}" timeout="${to}" action="${escapeXml(opts.actionUrl)}" method="POST" input="dtmf">` +
    say(opts.prompt) +
    `</Gather>`
  );
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Signature verification ─────────────────────────────────────────────────
// Twilio signs each webhook with HMAC-SHA1 over (full URL + sorted POST
// params concatenated as key+value), base64-encoded, using the auth token
// as the secret. The signature ships in the X-Twilio-Signature header.
// Spec: https://www.twilio.com/docs/usage/security#validating-requests

export function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  return expected === signature;
}

/** Parse form-encoded body and verify signature. Returns:
 *    - { ok: true,  params } when the signature checks out (or token unset, dev mode)
 *    - { ok: false, response } with a 403 NextResponse the caller should return as-is
 *  Centralising this means each endpoint has the same boilerplate at the top
 *  and the dev-mode bypass behaves identically everywhere. */
export async function readVerifiedForm(
  req: NextRequest,
  context: string,
): Promise<
  | { ok: true; params: Record<string, string> }
  | { ok: false; response: NextResponse }
> {
  const fd = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") params[k] = v;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    // Same dev-mode posture as stage 1 — accept unsigned, log loudly.
    console.warn(
      `[${context}] TWILIO_AUTH_TOKEN not set — signature verification skipped`
    );
    return { ok: true, params };
  }

  const sig = req.headers.get("x-twilio-signature") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? new URL(req.url).host;
  const original = new URL(req.url);
  const fullUrl = `${proto}://${host}${original.pathname}${original.search}`;
  if (!verifyTwilioSignature(authToken, sig, fullUrl, params)) {
    console.warn(`[${context}] signature mismatch — rejecting`);
    return { ok: false, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  return { ok: true, params };
}

// ── Time / DB helpers (small) ──────────────────────────────────────────────

/** Format a Date as "HH:MM" wall-clock time in Asia/Jerusalem (DST-aware). */
export function israelHHMM(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** "YYYY-MM-DD" in Asia/Jerusalem (used for today-bounds in duplicate checks). */
export function israelTodayYMD(d: Date = new Date()): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
}

// ── Attendance write + confirmation (shared between action/project routes) ──

/** Hebrew nouns for IN/OUT used in the spoken confirmations.
 *    "subject"   → "כניסתך" / "יציאתך"
 *    "from-site" → "לאתר"   / "מאתר" */
export function attendanceActionNoun(
  action: "in" | "out",
  form: "subject" | "from-site",
): string {
  if (action === "in")  return form === "subject" ? "כניסתך" : "לאתר";
  return form === "subject" ? "יציאתך" : "מאתר";
}

/** Insert a phone-call attendance row and build the TwiML confirmation.
 *  Returns the NextResponse ready to be returned by the route handler.
 *
 *  Shared between two call sites:
 *    1. /api/twilio/voice/action — single-active-project shortcut
 *    2. /api/twilio/voice/project — after the caller picks from the menu
 *  Keeping the INSERT shape in one place guarantees both paths produce
 *  identical rows (same columns, same source='phone-call', no lat/lng). */
export async function insertPhoneAttendance(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  staffId: string;
  action: "in" | "out";
  project: { id: string; name: string };
}): Promise<NextResponse> {
  const now = new Date();
  const hhmm = israelHHMM(now);
  const payload: Record<string, unknown> = {
    staff_id:        args.staffId,
    action:          args.action,
    project_id:      args.project.id,
    clock_at:        now.toISOString(),
    timestamp_label: hhmm,
    source:          "phone-call",
    // intentionally no lat/lng — phone calls have no GPS
  };

  const { error: insertErr } = await args.supabase.from("attendance").insert(payload);
  if (insertErr) {
    console.error("[twilio insert]", JSON.stringify(insertErr));
    return twimlResponse(say("שגיאה ברישום הנוכחות. אנא נסו שוב.") + "<Hangup/>");
  }

  const subject = attendanceActionNoun(args.action, "subject");
  const toFrom  = attendanceActionNoun(args.action, "from-site");
  const closing = args.action === "in" ? "יום עבודה מבורך." : "להתראות.";
  const msg = `נרשמה ${subject} ${toFrom} ${args.project.name} בשעה ${hhmm}. ${closing}`;
  console.info("[twilio insert] recorded:", args.action, "staff:", args.staffId, "project:", args.project.id);
  return twimlResponse(say(msg) + "<Hangup/>");
}
