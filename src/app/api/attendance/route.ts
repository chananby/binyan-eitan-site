import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";
import { israelDayStartISO } from "../../../lib/israel-time";
import { hasOpenRecord } from "../../../lib/attendance-logic";
import { isExit } from "../../../lib/attendance-time";
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

// Categorization of the failure — drives whether it shows on the admin's
// "worker got stuck" panel. See migration 20260706_attendance_failures.sql
// for the full rationale.
type FailureCategory = "worker_stuck" | "noise" | "security_signal";
interface FailureDetails {
  staffId?: string | null;
  action?: string | null;
  projectId?: string | null;
  lat?: string | null;
  lng?: string | null;
  distanceM?: number | null;
  uaFp?: string | null;
  /** Extra HTTP headers to include on the response (e.g. Retry-After). */
  headers?: Record<string, string>;
  /** Optional sub-reason surfaced in the response body as `detail`, so the
   *  client can pick a precise message when one error_code has two causes
   *  (e.g. no_open_entry_to_close: already-exited vs no-entry). Response-only —
   *  never written to attendance_failures, so classification stays unchanged. */
  responseDetail?: string | null;
}

/**
 * Log the failure to attendance_failures (fire-and-forget — a DB write
 * failure here MUST NOT block the error response to the worker) and
 * return the standard `{success:false, error:code}` NextResponse.
 *
 * When called with `supabase=null` (very early errors that fire before
 * the client is initialized: access_denied, session_expired,
 * too_many_attempts, invalid_body), the DB write is skipped. Those are
 * all `noise` or `security_signal`; the panel doesn't lose anything
 * critical. Log-worthy errors (worker_stuck, in particular) all fire
 * after supabase is initialized and therefore always get captured.
 */
async function failClock(
  supabase: ReturnType<typeof createServerClient> | null,
  code: string,
  category: FailureCategory,
  httpStatus: number,
  details?: FailureDetails,
): Promise<NextResponse> {
  if (supabase) {
    const parseNum = (v: string | null | undefined): number | null => {
      if (v == null || v === "") return null;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };
    try {
      await supabase.from("attendance_failures").insert({
        staff_id:    details?.staffId ?? null,
        error_code:  code,
        category,
        http_status: httpStatus,
        action:      details?.action ?? null,
        project_id:  details?.projectId ?? null,
        client_lat:  parseNum(details?.lat),
        client_lng:  parseNum(details?.lng),
        distance_m:  details?.distanceM ?? null,
        ua_fp:       details?.uaFp ?? null,
      });
    } catch (err) {
      // Fire-and-forget: log to server output and keep going. Under no
      // circumstances does a failed observability write block the
      // legitimate error response to the worker.
      console.error(`[failClock insert failed] code=${code}`, err);
    }
  }
  return NextResponse.json(
    { success: false, error: code, ...(details?.responseDetail ? { detail: details.responseDetail } : {}) },
    { status: httpStatus, ...(details?.headers ? { headers: details.headers } : {}) },
  );
}

// Extract a short user-agent fingerprint from the request. Not a full UA
// string (PII / bulky) — just enough to spot "one PWA on one phone is
// spamming server_error" patterns from admin queries.
function uaFingerprint(req: NextRequest): string | null {
  const ua = req.headers.get("user-agent");
  if (!ua) return null;
  return ua.slice(0, 40);
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
  const uaFp = uaFingerprint(req);
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        // Fires before supabase init — logging skipped. security_signal
        // acknowledged as unlogged in v1; if abuse patterns need to be
        // audited later, move supabase init above this block.
        return await failClock(null, "access_denied", "security_signal", 403, { uaFp });
      }
    } catch {
      return await failClock(null, "access_denied", "security_signal", 403, { uaFp });
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
    // Fires before supabase init — logging skipped (noise anyway).
    return await failClock(null, "session_expired", "noise", 401, { uaFp });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  // 15/15min — generous enough that retries (location refusal → retry, etc.)
  // don't lock out a worker, but still catches a stuck client.
  const rl = checkRateLimit(`staff:${staffId}:attendance-clock`, 15);
  if (!rl.allowed) {
    // Fires before supabase init — logging skipped. Deliberately: if a
    // worker's PWA is spamming, we don't want each hit to also hit the
    // DB. Rate-limit itself is the correct signal.
    return await failClock(null, "too_many_attempts", "noise", 429, {
      staffId, uaFp,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }

  let body: { action?: string; lat?: string; lng?: string; timestamp?: string; project_id?: string };
  try {
    body = await req.json();
  } catch {
    console.error("[attendance] invalid_body: JSON parse failed for staff", staffId);
    return await failClock(null, "invalid_body", "noise", 400, { staffId, uaFp });
  }

  const { action, lat, lng, timestamp, project_id } = body;

  // ── Init Supabase ──────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const missing = [
      !supabaseUrl && "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)",
      !supabaseKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean).join(", ");
    // Fires before supabase init: without env vars, there is no DB to
    // log to. Falls back to server console only. The technical detail
    // (which env var) stays in the log; the worker sees errServerBusy.
    console.error("[attendance] Missing env vars:", missing);
    return await failClock(null, "server_error", "worker_stuck", 500, { staffId, uaFp });
  }

  let supabase: ReturnType<typeof createServerClient>;
  try {
    supabase = createServerClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Supabase client init failed";
    console.error("[attendance] createServerClient threw:", msg);
    return await failClock(null, "server_error", "worker_stuck", 500, { staffId, uaFp });
  }

  // Body-shape guards moved BELOW supabase init on purpose: they're
  // categorized as worker_stuck (location_required especially — the
  // worker's phone couldn't send coords) and need to hit the failures
  // log. missing_action is technically pre-body but grouped with
  // location_required for symmetry — both mean "the worker's request
  // was missing something they can retry after re-clicking".
  if (!action) {
    return await failClock(supabase, "missing_action", "noise", 400, { staffId, uaFp });
  }
  if (!lat || !lng) {
    return await failClock(supabase, "location_required", "worker_stuck", 400, {
      staffId, action, projectId: project_id ?? null, uaFp,
    });
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
    return await failClock(supabase, "server_error", "worker_stuck", 500, { staffId, action, uaFp });
  }
  if (!staff) {
    return await failClock(supabase, "session_expired", "noise", 401, { staffId, action, uaFp });
  }
  if (staff.active === false) {
    return await failClock(supabase, "account_inactive", "worker_stuck", 403, {
      staffId: staff.id, action, uaFp,
    });
  }

  // ── 2. Normalize action + duplicate clock-in guard ────────────────────────
  const normalizedAction = action === "כניסה" ? "in" : action === "יציאה" ? "out" : action;
  if (!["in", "out"].includes(normalizedAction)) {
    return await failClock(supabase, "invalid_action", "noise", 400, {
      staffId: staff.id, action, uaFp,
    });
  }

  // Block a new clock-in only when an OPEN record exists (an entry not yet
  // closed by an exit) — NOT merely because the worker clocked in earlier
  // today. This lets a worker who already clocked out start a fresh shift
  // (e.g. moved to another site), while still blocking a double open entry.
  // See hasOpenRecord: "the LATEST event in the window is an entry".
  // Unit-tested in attendance-logic.test.ts.
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
      // Categorized as noise: a first click that hits already_clocked_in
      // usually means the worker refreshed and re-submitted; the earlier
      // clock is already in the log. Repeat abusers are already handled
      // by rate-limiting.
      return await failClock(supabase, "already_clocked_in", "noise", 409, {
        staffId: staff.id, action: normalizedAction, projectId: project_id ?? null, uaFp,
      });
    }
  }

  // Symmetric guard for OUT (B3): a clock-out with no matching open entry
  // within the last 24h is rejected. The window covers night shifts + the
  // morning-after "forgot to close" case (in at 23:00 yesterday → out at
  // 08:00 today is 9h back — well within 24h). Older orphans must go
  // through admin correction, not through a random OUT click that would
  // silently close the wrong shift and produce a bad paycheck.
  //
  // hasOpenRecord (last-event semantics) is what this needs: with the
  // rolling 24h window a worker who did IN→OUT yesterday and IN today
  // has ins=1/outs=1 = 0 (the old count-based check would have blocked
  // them). Their LATEST event, though, is today's IN — the shift is
  // manifestly open. See attendance-logic.ts for the full rationale.
  if (normalizedAction === "out") {
    const cutoffISO = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("attendance")
      .select("action, clock_at")
      .is("deleted_at", null)
      .eq("staff_id", staff.id)
      .in("action", ["in", "כניסה", "out", "יציאה"])
      .gte("clock_at", cutoffISO);
    if (!hasOpenRecord(recent ?? [], cutoffISO)) {
      // Classic worker-stuck signal — this is the exact class of block
      // that hit 15+ workers on 2026-07-06. Panel-worthy.
      //
      // Distinguish the two causes for the WORKER'S MESSAGE only (the block
      // itself is identical): a successful exit already exists in the window
      // → "already clocked out" (the double-tap case); no exit at all → "no
      // open entry, clock in first". Response-only `detail` — the logged row
      // keeps the same error_code, so the incompleteness double-tap filter is
      // untouched. hasOpenRecord / the block decision are NOT changed.
      const alreadyExited = (recent ?? []).some((r) => isExit(r.action));
      return await failClock(supabase, "no_open_entry_to_close", "worker_stuck", 409, {
        staffId: staff.id, action: normalizedAction, projectId: project_id ?? null, uaFp,
        responseDetail: alreadyExited ? "already_exited" : "no_entry",
      });
    }
  }

  const attendancePayload: Record<string, unknown> = {
    staff_id: staff.id,
    action:   normalizedAction,
    lat,
    lng,
    // Explicit — a live worker clock is approved immediately. Matches the DB
    // column default ('approved'); written here so the row is correct even if
    // that default is ever dropped (see 20260727_attendance_status_default.sql).
    status:   "approved",
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
        // here" vs "you already did it". Also the highest-value
        // panel entry: "N workers tried to clock in from off-site"
        // is exactly what chnn needs to spot patterns.
        return await failClock(supabase, "gps_out_of_range", "worker_stuck", 403, {
          staffId: staff.id, action: normalizedAction, projectId: project_id ?? null,
          lat, lng, distanceM: Math.round(dist), uaFp,
        });
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
        return await failClock(supabase, "server_error", "worker_stuck", 500, {
          staffId: staff.id, action: normalizedAction, projectId: project_id ?? null, uaFp,
        });
      }
      if ((remoteExitCount ?? 0) >= enf.monthlyRemoteExitCap) {
        return await failClock(supabase, "monthly_remote_exit_cap_reached", "worker_stuck", 409, {
          staffId: staff.id, action: normalizedAction, projectId: project_id ?? null,
          lat, lng, distanceM: Math.round(dist), uaFp,
        });
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
      return await failClock(supabase, "already_clocked_in", "noise", 409, {
        staffId: staff.id, action: normalizedAction, projectId: project_id ?? null, uaFp,
      });
    }
    logSupabaseError("attendance insert", insertError);
    return await failClock(supabase, "server_error", "worker_stuck", 500, {
      staffId: staff.id, action: normalizedAction, projectId: project_id ?? null, uaFp,
    });
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
