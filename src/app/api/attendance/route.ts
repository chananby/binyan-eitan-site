import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";
import { israelDayStartISO } from "../../../lib/israel-time";
import { hasOpenRecord, openEntryCount } from "../../../lib/attendance-logic";
import { getWorkerStaffIdFromRequest } from "../../../lib/admin-auth";
import { checkRateLimit } from "../../../lib/rate-limit";
import {
  loadAttendanceEnforcementSettings,
  israelMonthStartISO,
} from "../../../lib/attendance-settings";

export const runtime = "nodejs";

// Log the full Supabase error — code + message + details + hint all matter.
function logSupabaseError(context: string, err: { code?: string; message?: string; details?: string; hint?: string } | null) {
  if (!err) return;
  console.error(`[attendance] ${context}:`, JSON.stringify({
    code:    err.code,
    message: err.message,
    details: err.details,
    hint:    err.hint,
  }));
}

// POST → main worker clock-in/out endpoint.
//
// Identity comes from the signed worker cookie (/api/worker/identify). Any
// `phone` field in the body is ignored — the previous phone-based identity
// let any PIN-holder clock in / out on behalf of any worker.
//
// Required body: { action: 'in'|'out'|'כניסה'|'יציאה', lat, lng, timestamp?, project_id? }
export async function POST(req: NextRequest) {
  // ── Same-origin guard ──────────────────────────────────────────────────────
  // Blocks browser-originated cross-origin abuse (CSRF). Workers always submit
  // from the /attendance page, which is same-origin, so this is invisible to
  // legitimate use.
  // Every error return carries a stable `error` code (snake_case) that the
  // client maps to a localized message. Never send a human-readable string
  // — the client is multilingual and the worker sees T[lang].<key> chosen
  // from the code. See DEVELOPMENT_PRINCIPLES: "one code → one message".
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ success: false, error: "access_denied" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ success: false, error: "access_denied" }, { status: 403 });
    }
  }

  // ── Identity from signed cookie ───────────────────────────────────────────
  // Identity check comes BEFORE the rate-limit so the rate-limit can key on
  // staff_id, not IP. An entire crew clocking in from one site-Wi-Fi must
  // not throttle each other.
  const staffId = getWorkerStaffIdFromRequest(req);
  if (!staffId) {
    // Client treats 401 status as sessionExpired regardless of body — the
    // body code is documentation for anyone reading server logs.
    return NextResponse.json({ success: false, error: "session_expired" }, { status: 401 });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  // 15/15min — generous enough that retries (location refusal → retry, etc.)
  // don't lock out a worker, but still catches a stuck client.
  const rl = checkRateLimit(`staff:${staffId}:attendance-clock`, 15);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: { action?: string; lat?: string; lng?: string; timestamp?: string; project_id?: string };
  try {
    body = await req.json();
  } catch {
    console.error("[attendance] invalid_body: JSON parse failed for staff", staffId);
    return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 });
  }

  const { action, lat, lng, timestamp, project_id } = body;
  if (!action) {
    return NextResponse.json({ success: false, error: "missing_action" }, { status: 400 });
  }
  if (!lat || !lng) {
    return NextResponse.json({ success: false, error: "location_required" }, { status: 400 });
  }

  // ── Init Supabase ──────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const missing = [
      !supabaseUrl && "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)",
      !supabaseKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean).join(", ");
    // The technical detail (which env var) stays in the server log; the
    // worker sees a generic errServerBusy. Same pattern for the two
    // 500s below.
    console.error("[attendance] Missing env vars:", missing);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }

  let supabase: ReturnType<typeof createServerClient>;
  try {
    supabase = createServerClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Supabase client init failed";
    console.error("[attendance] createServerClient threw:", msg);
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }

  // ── 1. Look up staff by signed id ─────────────────────────────────────────
  // Bail to 401 if the cookie still verifies but the row was deactivated /
  // soft-deleted since the cookie was issued — symmetric with identify GET
  // and worker/history.
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, name, active")
    .eq("id", staffId)
    .is("deleted_at", null)
    .maybeSingle();

  if (staffError) {
    // Full staffError detail (message + code + hint) already went to the
    // server log via logSupabaseError. The worker gets the generic
    // errServerBusy — no leaking DB internals to the phone.
    logSupabaseError("staff lookup", staffError);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
  if (!staff) {
    return NextResponse.json({ success: false, error: "session_expired" }, { status: 401 });
  }
  if (staff.active === false) {
    return NextResponse.json({ success: false, error: "account_inactive" }, { status: 403 });
  }

  // ── 2. Normalize action + duplicate clock-in guard ────────────────────────
  const normalizedAction = action === "כניסה" ? "in" : action === "יציאה" ? "out" : action;
  if (!["in", "out"].includes(normalizedAction)) {
    return NextResponse.json({ success: false, error: "invalid_action" }, { status: 400 });
  }

  // Block a new clock-in only when an OPEN record exists (an entry not yet
  // closed by an exit) — NOT merely because the worker clocked in earlier
  // today. This lets a worker who already clocked out start a fresh shift
  // (e.g. moved to another site), while still blocking a double open entry.
  // See hasOpenRecord: open = today's entries > exits, day-scoped by clock_at,
  // counting both action vocabularies. Unit-tested in attendance-logic.test.ts.
  if (normalizedAction === "in") {
    const todayStr   = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
    const todayStart = israelDayStartISO(todayStr);
    const { data: todays } = await supabase
      .from("attendance")
      .select("action, clock_at")
      .is("deleted_at", null)
      .eq("staff_id", staff.id)
      .in("action", ["in", "כניסה", "out", "יציאה"])
      .gte("clock_at", todayStart);
    if (hasOpenRecord(todays ?? [], todayStart)) {
      return NextResponse.json({ success: false, error: "already_clocked_in" }, { status: 409 });
    }
  }

  // Symmetric guard for OUT (B3): a clock-out with no matching open entry
  // within the last 24h is rejected. The window covers night shifts + the
  // morning-after "forgot to close" case (in at 23:00 yesterday → out at
  // 08:00 today is 9h back — well within 24h). Older orphans must go
  // through admin correction, not through a random OUT click that would
  // silently close the wrong shift and produce a bad paycheck.
  if (normalizedAction === "out") {
    const cutoffISO = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("attendance")
      .select("action, clock_at")
      .is("deleted_at", null)
      .eq("staff_id", staff.id)
      .in("action", ["in", "כניסה", "out", "יציאה"])
      .gte("clock_at", cutoffISO);
    if (openEntryCount(recent ?? [], cutoffISO) === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "no_open_entry_to_close",
          message: "אין כניסה פתוחה לסגירה. אם צריך תיקון, פנה למנהל.",
        },
        { status: 409 },
      );
    }
  }

  const attendancePayload: Record<string, unknown> = {
    staff_id: staff.id,
    action:   normalizedAction,
    lat,
    lng,
  };

  if (timestamp)  attendancePayload.timestamp_label = timestamp;
  if (project_id) attendancePayload.project_id = project_id;
  attendancePayload.clock_at = new Date().toISOString();

  // ── Distance from project (for GPS anti-fraud flagging) ────────────────────
  if (project_id) {
    try {
      const { data: proj } = await supabase
        .from("projects")
        .select("lat, lng")
        .eq("id", project_id)
        .maybeSingle();
      if (proj?.lat != null && proj?.lng != null) {
        const { haversineMeters } = await import("../../../lib/distance");
        const dist = haversineMeters(
          Number(lat), Number(lng),
          Number(proj.lat), Number(proj.lng),
        );
        if (isFinite(dist)) {
          attendancePayload.distance_from_project_m = Math.round(dist);
        }
      }
    } catch (e) {
      console.warn("[attendance] distance calc failed:", e instanceof Error ? e.message : String(e));
    }
  }

  // ── Location enforcement ────────────────────────────────────────────────
  // This endpoint serves web workers only — Twilio clocks go through
  // /api/twilio/voice/* and admin manual entry through /api/admin/
  // attendance/manual, so no source guard is needed here to exempt them.
  // The enforcement rules only apply when `distance_from_project_m` was
  // populated above (project chosen + project has lat/lng). Missing
  // distance = we don't know how far the worker is, so we don't reject —
  // the row still records lat/lng and the admin can review.
  const dist = attendancePayload.distance_from_project_m as number | undefined;
  if (dist != null) {
    const enf = await loadAttendanceEnforcementSettings(supabase);
    if (enf.enforce && dist > enf.radiusMeters) {
      if (normalizedAction === "in") {
        // Hard block on clock-in — the worker is not at the site.
        // 403 (not 409) so clients can branch on "you can't do this
        // here" vs "you already did it".
        return NextResponse.json(
          { success: false, error: "gps_out_of_range" },
          { status: 403 },
        );
      }
      // Clock-out over the radius: counted as a "remote exit". Allowed
      // up to the monthly cap; blocked with 409 after that. Same
      // Israel-local month window the payroll routes use.
      const monthStart = israelMonthStartISO();
      const { count: remoteExitCount, error: countErr } = await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("staff_id", staff.id)
        .is("deleted_at", null)
        .in("action", ["out", "יציאה"])
        .gte("clock_at", monthStart)
        .gt("distance_from_project_m", enf.radiusMeters);
      if (countErr) {
        // countErr detail (code + message) already went to the log via
        // logSupabaseError. Worker sees the generic errServerBusy.
        logSupabaseError("remote-exit count", countErr);
        return NextResponse.json(
          { success: false, error: "server_error" },
          { status: 500 },
        );
      }
      if ((remoteExitCount ?? 0) >= enf.monthlyRemoteExitCap) {
        return NextResponse.json(
          { success: false, error: "monthly_remote_exit_cap_reached" },
          { status: 409 },
        );
      }
      // Under the cap → let the out through; the row's distance value
      // is the mark of "remote exit" in the data, no extra flag needed.
    }
  }

  const { error: insertError } = await supabase
    .from("attendance")
    .insert(attendancePayload);

  if (insertError) {
    // 23505 = unique_violation on attendance_staff_action_clockat_unique.
    // The app-layer guard already ran but a concurrent request slipped
    // through the TOCTOU window (B2 race): both requests read 0 opens,
    // both stamped clock_at, both tried to insert; the DB caught it.
    // Surface as a friendly 409 — same shape as the "already_clocked_in"
    // response the guard produces for the same-day case above, so
    // clients don't need a second branch.
    if ((insertError as { code?: string }).code === "23505") {
      return NextResponse.json(
        { success: false, error: "already_clocked_in" },
        { status: 409 },
      );
    }
    logSupabaseError("attendance insert", insertError);
    return NextResponse.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }

  // ── 3. Daily message (optional, non-blocking) ──────────────────────────────
  let dailyMessage: string | null = null;
  try {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
    const [{ data: msg }, { data: msgDate }] = await Promise.all([
      supabase.from("settings").select("value").eq("key", "daily_message").maybeSingle(),
      supabase.from("settings").select("value").eq("key", "daily_message_date").maybeSingle(),
    ]);
    if (msg?.value && msgDate?.value === today) {
      dailyMessage = msg.value;
    }
  } catch {
    // Non-critical — don't fail the whole request
  }

  console.info("[attendance] success — staff:", staff.name);

  return NextResponse.json({
    success: true,
    name: staff.name,
    message: dailyMessage,
  });
}
