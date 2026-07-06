-- ============================================================
-- Binyan Eitan — attendance_failures (silent-failure log)
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
--
-- Motivation: on 2026-07-06, 15+ active workers were blocked from
-- clocking out by a bug in the B3 guard. The admin only discovered
-- it because one worker was standing next to him and sent a
-- screenshot. Every other blocked worker was a silent failure —
-- nothing surfaced to the admin dashboard, and there was no way to
-- ask "who got stuck today" after the fact.
--
-- This table captures every error return from /api/attendance so
-- the same silent-failure class of bug can never repeat. The write
-- path is fire-and-forget (a failed INSERT here MUST NOT block the
-- error response to the worker); the read path is a small admin
-- panel that surfaces the `worker_stuck` category as a count on
-- AttentionPanel with a details subtab in AttendanceTab.
--
-- Categories (see failClock() in /api/attendance/route.ts):
--   • worker_stuck    — a genuine "worker tried to clock in/out and
--                       something the app should surface stopped
--                       them" (gps_out_of_range, no_open_entry,
--                       server_error, account_inactive, etc.).
--   • noise           — retryable / stale-client noise the admin
--                       doesn't need to see (session_expired,
--                       too_many_attempts, invalid_body). Logged
--                       for pattern analysis, not for the panel.
--   • security_signal — CSRF / access_denied. Logged but not
--                       currently surfaced.
--
-- Never write payroll. This table is purely observational.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS attendance_failures (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL when the failure fires BEFORE identity is known (early
  -- guards like access_denied that trip on the origin check, or
  -- session_expired when the cookie is unreadable).
  staff_id       uuid          NULL REFERENCES staff(id),
  -- Stable snake_case error code — same string the worker's client
  -- receives in `data.error`. Kept as text (not an enum) so a new
  -- code can be added in code without a migration.
  error_code     text          NOT NULL,
  category       text          NOT NULL
                 CHECK (category IN ('worker_stuck', 'noise', 'security_signal')),
  -- HTTP status the endpoint actually returned — matches the code
  -- but tracked explicitly for easier "why 500?" queries later.
  http_status    smallint      NOT NULL,
  -- The action the worker was attempting ('in' / 'out') when known.
  -- NULL for pre-body errors (invalid_body, access_denied).
  action         text          NULL,
  -- Optional project context — populated for GPS-related failures
  -- so "N workers got gps_out_of_range at project X" is a single
  -- query.
  project_id     uuid          NULL REFERENCES projects(id),
  -- GPS coords the worker's client sent (may be null / invalid on
  -- location_required). Precision matches attendance rows.
  client_lat     numeric(10,7) NULL,
  client_lng     numeric(10,7) NULL,
  -- Computed by the route when project coords are available —
  -- lets the panel say "was 140m from the site" without a re-calc.
  distance_m     integer       NULL,
  -- Short user-agent fingerprint (first ~40 chars) — helps spot
  -- "one PWA on one phone is spamming server_error" patterns.
  -- Not a full UA log; no PII.
  ua_fp          text          NULL,
  attempted_at   timestamptz   NOT NULL DEFAULT now()
);

-- Hot path: admin panel query for "worker_stuck in the last 24h".
-- Partial index keeps it tiny — most rows are noise, so we skip
-- indexing them.
CREATE INDEX IF NOT EXISTS attendance_failures_worker_stuck_recent_idx
  ON attendance_failures (attempted_at DESC)
  WHERE category = 'worker_stuck';

-- Secondary: "show me all failures for staff X" — used when an
-- admin drills into a specific worker's history.
CREATE INDEX IF NOT EXISTS attendance_failures_staff_recent_idx
  ON attendance_failures (staff_id, attempted_at DESC);

-- RLS enabled with no policies — same defense-in-depth posture as
-- attendance_corrections and attendance itself. Anon /
-- authenticated roles get zero access; service_role (used by
-- every API route) bypasses RLS.
ALTER TABLE attendance_failures ENABLE ROW LEVEL SECURITY;

COMMIT;
