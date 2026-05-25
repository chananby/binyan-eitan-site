/**
 * POST /api/twilio/voice — Twilio inbound-voice webhook (stage 2 entry point)
 *
 * Flow:
 *   Twilio → here → caller-ID lookup → <Gather> for IN/OUT (DTMF 1 or 2)
 *
 * The Gather's action URL is /api/twilio/voice/action?staffId=<id>, which
 * Twilio POSTs to with the digit the caller pressed. staffId is carried in
 * the query string because Twilio is stateless across calls; the URL is
 * part of the X-Twilio-Signature payload so it can't be forged when
 * TWILIO_AUTH_TOKEN is set.
 *
 * Configure in Twilio Console:
 *   Phone Numbers → Active Numbers → <the IL number> → Voice & Fax
 *     "A CALL COMES IN" → Webhook
 *     URL:    https://binyaneitan.com/api/twilio/voice
 *     Method: HTTP POST
 *
 * Required env vars:
 *   TWILIO_AUTH_TOKEN   — used to verify X-Twilio-Signature. Optional in dev:
 *                         the endpoint accepts unsigned requests and logs a
 *                         loud warning. Production should always have this set.
 */

import { NextRequest } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { normalizePhone, phoneVariants } from "../../../../lib/phone";
import { twimlResponse, say, gatherDigits, readVerifiedForm } from "../../../../lib/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const verified = await readVerifiedForm(req, "twilio/voice");
  if (!verified.ok) return verified.response;
  const params = verified.params;

  const fromRaw = params.From ?? "";
  if (!fromRaw) {
    console.warn("[twilio/voice] no From in payload");
    return twimlResponse(
      say("שגיאה: מספר המתקשר לא התקבל. נסו שוב בעוד רגע.") + "<Hangup/>"
    );
  }

  // ── Caller-ID lookup ───────────────────────────────────────────────────────
  let staffId: string | null = null;
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
    if (staff && (staff.active ?? true)) {
      staffId = staff.id;
      staffName = staff.name;
    }
  } catch (e) {
    console.error("[twilio/voice] lookup threw:", e instanceof Error ? e.message : String(e));
  }

  if (!staffId || !staffName) {
    console.info("[twilio/voice] unknown caller:", fromRaw);
    return twimlResponse(
      say("המספר לא מזוהה במערכת. אנא פנו למשרד.") + "<Hangup/>"
    );
  }

  // ── Gather IN/OUT choice ───────────────────────────────────────────────────
  // staffId travels in the query string so the next hop knows who's on the
  // line without another DB round-trip; Twilio's signature covers the URL.
  console.info("[twilio/voice] connected:", staffName, "from", fromRaw);
  const actionUrl = `/api/twilio/voice/action?staffId=${encodeURIComponent(staffId)}`;
  return twimlResponse(
    gatherDigits({
      actionUrl,
      prompt: `שלום ${staffName}. הקש 1 לכניסה, הקש 2 ליציאה.`,
    }) +
    // Fallback if Gather times out with no input — re-prompt is overkill for
    // stage 2, just hang up cleanly so Twilio doesn't loop.
    say("לא קיבלנו בחירה. נסו שוב מאוחר יותר.") +
    "<Hangup/>"
  );
}
