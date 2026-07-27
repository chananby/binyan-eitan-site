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
import { hasOpenRecord } from "./attendance-logic";
import { isEntry, isExit } from "./attendance-time";
import { israelDayStartISO } from "./israel-time";

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

/**
 * Duplicate / open-record gate for a phone clock, shared by /action's early
 * check AND the insert-time re-check in insertPhoneAttendance below.
 *
 * This is a VERBATIM extraction of the gate /action has always run — fetch
 * today's rows in BOTH action vocabularies ("in"/"out" + "כניסה"/"יציאה"),
 * day-scoped by clock_at, routed through hasOpenRecord:
 *   IN  → block when the last event today is an entry (unclosed shift; a
 *         second IN would overlap).
 *   OUT → block when there's no open entry (no event today, or the last event
 *         is already an exit) — else the OUT is an orphan.
 * The block wording matches /action byte-for-byte.
 *
 * A query failure is RETURNED (kind:"query_error"), never thrown, so each
 * caller picks its policy: /action fails closed (system-error TwiML, its
 * historical behaviour); the insert-time check fails OPEN — see below.
 */
export type PhoneClockGate =
  | { kind: "pass" }
  | { kind: "block"; response: NextResponse }
  | { kind: "query_error"; error: unknown };

export async function checkPhoneClockGate(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  staffId: string;
  action: "in" | "out";
}): Promise<PhoneClockGate> {
  const { supabase, staffId, action } = args;
  const todayStart = israelDayStartISO(israelTodayYMD());
  const { data: todays, error: openErr } = await supabase
    .from("attendance")
    .select("action, clock_at")
    .is("deleted_at", null)
    .eq("staff_id", staffId)
    .in("action", ["in", "כניסה", "out", "יציאה"])
    .gte("clock_at", todayStart)
    .order("clock_at", { ascending: false });
  if (openErr) return { kind: "query_error", error: openErr };
  const rows = (todays ?? []) as Array<{ action: string; clock_at: string | null }>;
  const openNow = hasOpenRecord(rows, todayStart);

  if (action === "in" && openNow) {
    // Latest entry (rows is ordered desc by clock_at) → read its time aloud.
    const openRow = rows.filter((r) => isEntry(r.action))[0];
    const when = openRow?.clock_at ? israelHHMM(new Date(openRow.clock_at)) : "";
    const msg = when
      ? `כבר רשומה כניסה פתוחה היום בשעה ${when}. להתראות.`
      : `כבר רשומה כניסה פתוחה היום. להתראות.`;
    return { kind: "block", response: twimlResponse(say(msg) + "<Hangup/>") };
  }
  if (action === "out" && !openNow) {
    const lastExit = rows.filter((r) => isExit(r.action))[0];
    if (lastExit) {
      const when = lastExit.clock_at ? israelHHMM(new Date(lastExit.clock_at)) : "";
      const msg = when
        ? `כבר רשומה יציאה היום בשעה ${when}. להתראות.`
        : `כבר רשומה יציאה היום. להתראות.`;
      return { kind: "block", response: twimlResponse(say(msg) + "<Hangup/>") };
    }
    return { kind: "block", response: twimlResponse(say("אין כניסה פתוחה לסגירה היום. אנא פנו למנהל העבודה.") + "<Hangup/>") };
  }
  return { kind: "pass" };
}

/** Record a fail-open event (gate query failed → we clocked anyway) to
 *  attendance_failures. Fire-and-forget: a logging failure must NEVER block the
 *  clock insert. category='noise' keeps it out of the worker-stuck panel. */
async function logPhoneGateQueryFailure(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  staffId: string,
  action: "in" | "out",
  projectId: string,
  err: unknown,
): Promise<void> {
  console.error("[twilio gate] open-record query failed — failing open:", JSON.stringify(err));
  try {
    await supabase.from("attendance_failures").insert({
      staff_id:    staffId,
      error_code:  "phone_gate_query_failed",
      category:    "noise",
      http_status: 500,
      action,
      project_id:  projectId ?? null,
    });
  } catch (e) {
    console.error("[twilio gate] failure-log insert failed:", e);
  }
}

/** Outcome of a phone clock attempt. Structured (not a bare NextResponse and
 *  never a thrown error) so the caller knows what happened — but each variant
 *  carries a ready-to-return `response` so the caller just plays it. */
export type PhoneClockOutcome =
  | { status: "inserted";     response: NextResponse }
  | { status: "blocked";      response: NextResponse }
  | { status: "insert_error"; response: NextResponse };

/** Insert a phone-call attendance row and build the TwiML confirmation.
 *
 *  Shared between two call sites:
 *    1. /api/twilio/voice/action — single-active-project shortcut
 *    2. /api/twilio/voice/project — after the caller picks from the menu
 *  Keeping the INSERT shape in one place guarantees both paths produce
 *  identical rows (same columns, same source='phone-call', no lat/lng).
 *
 *  Runs the open-record gate ONE MORE TIME right before the insert. /action
 *  already ran it, but between there and here — especially on the multi-project
 *  path, where the caller spends seconds pressing a digit — a concurrent clock
 *  (web / another call) can flip the state, and /project used to insert blind.
 *  This closes that TOCTOU. FAIL-OPEN: if the gate's own QUERY fails we log and
 *  insert anyway — a worker who can't clock in is worse than a rare duplicate
 *  (same stance as GPS enforcement's fail-open). */
export async function insertPhoneAttendance(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  staffId: string;
  action: "in" | "out";
  project: { id: string; name: string };
}): Promise<PhoneClockOutcome> {
  const gate = await checkPhoneClockGate({
    supabase: args.supabase, staffId: args.staffId, action: args.action,
  });
  if (gate.kind === "block") {
    return { status: "blocked", response: gate.response };
  }
  if (gate.kind === "query_error") {
    await logPhoneGateQueryFailure(args.supabase, args.staffId, args.action, args.project.id, gate.error);
    // fall through — fail open and insert
  }

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
    return { status: "insert_error", response: twimlResponse(say("שגיאה ברישום הנוכחות. אנא נסו שוב.") + "<Hangup/>") };
  }

  const subject = attendanceActionNoun(args.action, "subject");
  const toFrom  = attendanceActionNoun(args.action, "from-site");
  const closing = args.action === "in" ? "יום עבודה מבורך." : "להתראות.";
  const msg = `נרשמה ${subject} ${toFrom} ${args.project.name} בשעה ${hhmm}. ${closing}`;
  console.info("[twilio insert] recorded:", args.action, "staff:", args.staffId, "project:", args.project.id);
  return { status: "inserted", response: twimlResponse(say(msg) + "<Hangup/>") };
}
