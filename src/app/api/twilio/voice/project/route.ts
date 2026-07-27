/**
 * POST /api/twilio/voice/project — DTMF handler for project selection.
 *
 * Hit by the second <Gather> from /api/twilio/voice/action, only when the
 * shop has more than one active project (otherwise /action takes the
 * single-project shortcut and we never get here).
 *
 * Query params (all set by /action when it built the Gather action URL):
 *   staffId    — UUID of the caller
 *   action     — "in" or "out"
 *   projectIds — comma-separated UUIDs in the same order the caller heard
 *                them announced. Index N (1-based) in the prompt maps to
 *                projectIds[N-1] here.
 *
 * Form params (from Twilio):
 *   Digits     — "1".."9" — the project number the caller pressed
 *
 * We re-fetch the project name by ID rather than passing names through the
 * URL — Hebrew names + commas would mangle the query string, and the lookup
 * is a single round-trip on an indexed column.
 */

import { NextRequest } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import {
  twimlResponse, say, readVerifiedForm, insertPhoneAttendance,
} from "../../../../../lib/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const verified = await readVerifiedForm(req, "twilio/voice/project");
  if (!verified.ok) return verified.response;
  const params = verified.params;

  const url = new URL(req.url);
  const staffId = url.searchParams.get("staffId") ?? "";
  const actionRaw = url.searchParams.get("action") ?? "";
  const projectIdsRaw = url.searchParams.get("projectIds") ?? "";
  const digit = params.Digits ?? "";

  if (!staffId || !["in", "out"].includes(actionRaw) || !projectIdsRaw) {
    console.warn("[twilio/voice/project] missing/invalid query params:",
      JSON.stringify({ staffId: !!staffId, actionRaw, projectIdsRawLen: projectIdsRaw.length }));
    return twimlResponse(say("שגיאת מערכת. אנא חייגו שוב.") + "<Hangup/>");
  }
  const action = actionRaw as "in" | "out";

  const projectIds = projectIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  // Defence in depth: never honour > 9 IDs even if /action somehow built a
  // longer list, because DTMF can't pick beyond a single digit.
  const offered = projectIds.slice(0, 9);

  const idx = parseInt(digit, 10);
  if (!Number.isFinite(idx) || idx < 1 || idx > offered.length) {
    console.info("[twilio/voice/project] invalid DTMF:", JSON.stringify(digit),
      "offered:", offered.length);
    return twimlResponse(
      say("בחירה לא תקפה. אנא חייגו שוב ונסו שנית.") + "<Hangup/>"
    );
  }
  const chosenProjectId = offered[idx - 1];

  const supabase = createServerClient();
  const { data: proj, error: projErr } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("id", chosenProjectId)
    .maybeSingle();
  if (projErr) {
    console.error("[twilio/voice/project] project fetch error:", JSON.stringify(projErr));
    return twimlResponse(say("שגיאת מערכת זמנית. אנא נסו שוב.") + "<Hangup/>");
  }
  if (!proj || proj.status !== "active") {
    // The project went inactive (or was deleted) between /action listing
    // it and the caller pressing the digit — extremely narrow window, but
    // possible.
    console.warn("[twilio/voice/project] project not active at pick time:", chosenProjectId);
    return twimlResponse(
      say("האתר שבחרת אינו פעיל יותר. אנא חייגו שוב.") + "<Hangup/>"
    );
  }

  const outcome = await insertPhoneAttendance({
    supabase,
    staffId,
    action,
    project: { id: proj.id, name: proj.name },
  });
  // outcome may be blocked (insert-time gate caught a race), insert_error, or
  // inserted — each carries the right TwiML to play back.
  return outcome.response;
}
