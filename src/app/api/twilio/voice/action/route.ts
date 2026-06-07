/**
 * POST /api/twilio/voice/action — DTMF handler for IN/OUT choice.
 *
 * Hit by the <Gather> from /api/twilio/voice. The caller has just pressed
 * 1 (in) or 2 (out). Responsibilities here:
 *   1. Validate the digit.
 *   2. Duplicate-guard against same-day double IN or double OUT.
 *   3. Fetch active projects.
 *   4. If exactly one active project → insert the attendance row and confirm.
 *   5. If multiple → forward the caller to /api/twilio/voice/project with a
 *      second <Gather>, passing the IN/OUT choice + project list via the URL.
 *
 * Query params:
 *   staffId   — UUID of the identified caller (set by /api/twilio/voice)
 *
 * Form params (from Twilio):
 *   Digits    — "1" or "2"
 */

import { NextRequest } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import {
  twimlResponse, say, gatherDigits, readVerifiedForm,
  israelHHMM, israelTodayYMD, insertPhoneAttendance,
} from "../../../../../lib/twilio";
import { israelDayStartISO } from "../../../../../lib/israel-time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const verified = await readVerifiedForm(req, "twilio/voice/action");
  if (!verified.ok) return verified.response;
  const params = verified.params;

  const url = new URL(req.url);
  const staffId = url.searchParams.get("staffId") ?? "";
  const digit = params.Digits ?? "";

  if (!staffId) {
    console.warn("[twilio/voice/action] missing staffId in query");
    return twimlResponse(say("שגיאה בזיהוי. אנא חייגו שוב.") + "<Hangup/>");
  }

  let action: "in" | "out";
  if (digit === "1")      action = "in";
  else if (digit === "2") action = "out";
  else {
    console.info("[twilio/voice/action] invalid DTMF:", JSON.stringify(digit));
    return twimlResponse(
      say("בחירה לא תקפה. אנא חייגו שוב והקישו 1 לכניסה או 2 ליציאה.") +
      "<Hangup/>"
    );
  }

  const supabase = createServerClient();

  // ── Re-fetch staff name for confirmation messages ────────────────────────
  // We could pass the name through the query string, but a lookup is cheap
  // and avoids encoding/length concerns with Hebrew characters in URLs.
  const { data: staffRow, error: staffErr } = await supabase
    .from("staff")
    .select("id, name, active")
    .eq("id", staffId)
    .is("deleted_at", null)
    .maybeSingle();
  if (staffErr) {
    console.error("[twilio/voice/action] staff fetch error:", JSON.stringify(staffErr));
    return twimlResponse(say("שגיאת מערכת זמנית. נסו שוב בעוד רגע.") + "<Hangup/>");
  }
  if (!staffRow || staffRow.active === false) {
    return twimlResponse(say("המספר לא מזוהה במערכת. אנא פנו למשרד.") + "<Hangup/>");
  }

  // ── Duplicate-guard ──────────────────────────────────────────────────────
  // Same-day same-action blocks recording a second time. Matches web-flow
  // behavior for "in" and extends it to "out" since phone callers can't see
  // their own day so far and might re-call to "make sure". Web flow allows
  // double-out today; we don't, by user request.
  const todayStart = israelDayStartISO(israelTodayYMD());
  const { data: existing, error: existingErr } = await supabase
    .from("attendance")
    .select("id, clock_at, timestamp_label, created_at")
    .is("deleted_at", null)
    .eq("staff_id", staffId)
    .eq("action", action)
    .gte("created_at", todayStart)
    .order("created_at", { ascending: false })
    .limit(1);
  if (existingErr) {
    console.error("[twilio/voice/action] dup-check error:", JSON.stringify(existingErr));
    return twimlResponse(say("שגיאת מערכת זמנית. נסו שוב בעוד רגע.") + "<Hangup/>");
  }
  if (existing && existing.length > 0) {
    const row = existing[0];
    // Prefer clock_at (always set by both flows) over timestamp_label.
    // Web check-ins sometimes store timestamp_label as a full localised
    // datetime string ("25.05.2026, 08:47") rather than HH:MM, which is
    // fine for table display but makes the IVR sentence wordy. Re-formatting
    // from clock_at guarantees a clean "HH:MM" we can read aloud.
    const when =
      row.clock_at ? israelHHMM(new Date(row.clock_at)) :
      row.created_at ? israelHHMM(new Date(row.created_at)) :
      row.timestamp_label || "";
    const verb = action === "in" ? "כניסה" : "יציאה";
    const msg = when
      ? `כבר רשומה ${verb} היום בשעה ${when}. להתראות.`
      : `כבר רשומה ${verb} היום. להתראות.`;
    return twimlResponse(say(msg) + "<Hangup/>");
  }

  // ── Fetch active projects ───────────────────────────────────────────────
  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("id, name")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (projErr) {
    console.error("[twilio/voice/action] projects fetch error:", JSON.stringify(projErr));
    return twimlResponse(say("שגיאה בטעינת אתרים. נסו שוב מאוחר יותר.") + "<Hangup/>");
  }

  const projectList = (projects ?? []).filter((p) => p.id && p.name);

  if (projectList.length === 0) {
    return twimlResponse(say("אין אתרים פעילים. אנא פנו למשרד.") + "<Hangup/>");
  }

  if (projectList.length === 1) {
    // Single-project shortcut: insert immediately, no second Gather.
    return await insertPhoneAttendance({
      supabase,
      staffId,
      action,
      project: projectList[0],
    });
  }

  // ── Multi-project: build second Gather ──────────────────────────────────
  // DTMF gives us 0–9. We cap at 9 projects in the picker; if there are more
  // active projects than digits, the caller hears the top 9 alphabetically
  // (and the office should reduce the active set rather than us inventing
  // a multi-digit menu the caller can't navigate). Practically there will
  // never be more than a handful of active sites at once.
  const offered = projectList.slice(0, 9);
  const projectIds = offered.map((p) => p.id).join(",");
  const listPrompt = offered
    .map((p, i) => `הקש ${i + 1} ל${p.name}`)
    .join(", ");
  const verbHe = action === "in" ? "לכניסה" : "ליציאה";
  const prompt = `${verbHe}. בחר אתר עבודה: ${listPrompt}.`;

  const actionUrl =
    `/api/twilio/voice/project?staffId=${encodeURIComponent(staffId)}` +
    `&action=${action}` +
    `&projectIds=${encodeURIComponent(projectIds)}`;

  return twimlResponse(
    gatherDigits({ actionUrl, prompt, timeoutSec: 10 }) +
    say("לא קיבלנו בחירה. נסו שוב מאוחר יותר.") +
    "<Hangup/>"
  );
}
