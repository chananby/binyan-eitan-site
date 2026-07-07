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
import { isEntry, isExit } from "../../../../../lib/attendance-time";
import { hasOpenRecord } from "../../../../../lib/attendance-logic";

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
  // Symmetric shape for both IN and OUT: fetch today's rows in BOTH
  // action vocabularies ("in"/"out" + "כניסה"/"יציאה" — chnn's manual
  // entries and the worker web flow use Hebrew; live IVR and the /admin
  // clock-out endpoint use English) and route the decision through
  // hasOpenRecord. Day scoping is by clock_at, never created_at.
  //
  //   IN  → block when the LAST event today is an entry (an unclosed
  //         shift is already on the clock; a second IN would overlap).
  //   OUT → block when the LAST event today is an exit (already gone
  //         home; a second OUT would duplicate) OR when there's no
  //         event at all (no open entry to close — otherwise the OUT
  //         becomes an orphan that surfaces as a phantom −N-hour shift
  //         in the monthly report).
  //
  // Before this branch the OUT guard used .eq("action", "out") — English
  // only. A worker whose manual "יציאה" had been logged by chnn earlier
  // today could call in, get "no existing OUT found", and mint a
  // duplicate. Weiss on the phone. Also: no hasOpenRecord check meant
  // pressing 2 with no IN would create an orphan exit.
  const todayStart = israelDayStartISO(israelTodayYMD());
  const { data: todays, error: openErr } = await supabase
    .from("attendance")
    .select("action, clock_at")
    .is("deleted_at", null)
    .eq("staff_id", staffId)
    .in("action", ["in", "כניסה", "out", "יציאה"])
    .gte("clock_at", todayStart)
    .order("clock_at", { ascending: false });
  if (openErr) {
    console.error("[twilio/voice/action] dup-check error:", JSON.stringify(openErr));
    return twimlResponse(say("שגיאת מערכת זמנית. נסו שוב בעוד רגע.") + "<Hangup/>");
  }
  const rows = todays ?? [];
  const openNow = hasOpenRecord(rows, todayStart);

  if (action === "in" && openNow) {
    // Latest entry (rows is ordered desc by clock_at) → read its time aloud.
    const openRow = rows.filter((r) => isEntry(r.action))[0];
    const when = openRow?.clock_at ? israelHHMM(new Date(openRow.clock_at)) : "";
    const msg = when
      ? `כבר רשומה כניסה פתוחה היום בשעה ${when}. להתראות.`
      : `כבר רשומה כניסה פתוחה היום. להתראות.`;
    return twimlResponse(say(msg) + "<Hangup/>");
  }
  if (action === "out" && !openNow) {
    // No open entry to close. Distinguish two shapes for the caller so
    // they know whether the office should hear about it:
    //   • last event today was already an OUT → "כבר רשומה יציאה"
    //     (they double-called; harmless, no admin action needed).
    //   • no relevant events today at all → "אין כניסה פתוחה" (worker
    //     never clocked in — probably needs a foreman to help).
    const lastExit = rows.filter((r) => isExit(r.action))[0];
    if (lastExit) {
      const when = lastExit.clock_at ? israelHHMM(new Date(lastExit.clock_at)) : "";
      const msg = when
        ? `כבר רשומה יציאה היום בשעה ${when}. להתראות.`
        : `כבר רשומה יציאה היום. להתראות.`;
      return twimlResponse(say(msg) + "<Hangup/>");
    }
    return twimlResponse(
      say("אין כניסה פתוחה לסגירה היום. אנא פנו למנהל העבודה.") + "<Hangup/>",
    );
  }

  // ── Fetch active projects ───────────────────────────────────────────────
  // project_type='site' keeps overhead projects out of the voice IVR's
  // site list — a worker calling in for clock-in/out should never hear
  // "תקורות" as a numbered option.
  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("id, name")
    .eq("status", "active")
    .eq("project_type", "site")
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
