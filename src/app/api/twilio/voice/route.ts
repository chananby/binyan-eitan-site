/**
 * POST /api/twilio/voice — Twilio inbound-voice webhook (stage 1)
 *
 * STAGE 1 (this file): the bare minimum to prove the chain works end-to-end:
 *   Twilio  →  webhook  →  caller-ID lookup  →  Hebrew TTS greeting
 *
 * No attendance row is written here, no IN/OUT logic, no project selection.
 * Stage 2 will add a <Gather> for DTMF, the IN/OUT branch, project picking,
 * and the actual attendance insert with source='phone-call'.
 *
 * Configure in Twilio Console:
 *   Phone Numbers → Active Numbers → <the IL number> → Voice & Fax
 *     "A CALL COMES IN" → Webhook
 *     URL:    https://binyaneitan.com/api/twilio/voice
 *     Method: HTTP POST
 *
 * Required env vars (set in Vercel once the Twilio account exists):
 *   TWILIO_AUTH_TOKEN   — used to verify the X-Twilio-Signature header.
 *                         If unset, the endpoint accepts requests unverified
 *                         and logs a loud warning. Stage 1 writes no data so
 *                         the worst a forged request can do is hear a greeting,
 *                         but production should always have this set.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServerClient } from "../../../../lib/supabase";
import { normalizePhone, phoneVariants } from "../../../../lib/phone";

export const runtime = "nodejs";
// Always run the request live — never cache. TwiML responses must be fresh
// because they're tied to the specific caller and (eventually) DB state.
export const dynamic = "force-dynamic";

// ── TwiML helpers ──────────────────────────────────────────────────────────

function twimlResponse(body: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`;
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Hebrew TTS via Amazon Polly Carmit-Neural — natural female voice.
 *  Twilio docs require both the voice and language attributes for proper
 *  fallback when SSML features differ between voice engines. */
function say(text: string): string {
  return `<Say voice="Polly.Carmit-Neural" language="he-IL">${escapeXml(text)}</Say>`;
}

function escapeXml(s: string): string {
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
function verifyTwilioSignature(
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

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Twilio sends application/x-www-form-urlencoded. Next.js parses both
  // urlencoded and multipart via Request.formData().
  const fd = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") params[k] = v;
  }

  // ── 1. Verify signature (when configured) ────────────────────────────────
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const sig = req.headers.get("x-twilio-signature") ?? "";
    // Reconstruct the public URL Twilio signed. On Vercel the request URL
    // already reflects the public host; the forwarded headers add safety
    // if a future deploy sits behind another proxy.
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("host") ?? new URL(req.url).host;
    const original = new URL(req.url);
    const fullUrl = `${proto}://${host}${original.pathname}${original.search}`;
    if (!verifyTwilioSignature(authToken, sig, fullUrl, params)) {
      console.warn("[twilio/voice] signature mismatch — rejecting");
      return new NextResponse("Forbidden", { status: 403 });
    }
  } else {
    // TODO(stage-2): once TWILIO_AUTH_TOKEN is set in Vercel, this branch
    // should never run in production. Keep the warning loud so the gap
    // shows up in logs immediately.
    console.warn(
      "[twilio/voice] TWILIO_AUTH_TOKEN not set — signature verification skipped (stage-1 dev mode)"
    );
  }

  // ── 2. Identify caller ───────────────────────────────────────────────────
  const fromRaw = params.From ?? "";
  if (!fromRaw) {
    console.warn("[twilio/voice] no From in payload");
    return twimlResponse(
      say("שגיאה: מספר המתקשר לא התקבל. נסו שוב בעוד רגע.") + "<Hangup/>"
    );
  }

  let staffName: string | null = null;
  try {
    const normalized = normalizePhone(fromRaw);
    const variants = phoneVariants(normalized);
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("staff")
      .select("id, name, active")
      .in("phone", variants)
      .is("deleted_at", null)
      .limit(1);
    if (error) {
      console.error("[twilio/voice] staff lookup error:", JSON.stringify(error));
    }
    const staff = data?.[0];
    if (staff && (staff.active ?? true)) staffName = staff.name;
  } catch (e) {
    console.error("[twilio/voice] lookup threw:", e instanceof Error ? e.message : String(e));
  }

  if (!staffName) {
    console.info("[twilio/voice] unknown caller:", fromRaw);
    return twimlResponse(
      say("המספר לא מזוהה במערכת. אנא פנו למשרד.") + "<Hangup/>"
    );
  }

  // ── 3. Stage-1 greeting (no attendance write yet) ────────────────────────
  console.info("[twilio/voice] connected:", staffName, "from", fromRaw);
  return twimlResponse(
    say(`שלום ${staffName}. המערכת מחוברת. שלב הבא יתווסף בקרוב.`) +
    "<Hangup/>"
  );
}
