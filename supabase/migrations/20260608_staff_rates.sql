-- ============================================================
-- Binyan Eitan — staff_rates: per-month rate history
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- One rate row per worker per month (effective_month always = 1st of
-- the month). When the admin "updates a rate" we INSERT a new row for
-- the target month rather than overwriting the staff table — so any
-- past payroll run is reproducible at the exact rate that applied that
-- month, no matter how rates have moved since.
--
-- Lookup semantics (implemented in src/lib/staff-rates.ts):
--   "The rate for month M" = the row with the *largest* effective_month
--   that is ≤ M-01. A January row stays in force through every later
--   month until a newer row supersedes it.
--
-- Seed at the bottom mirrors the current staff.{hourly,daily,monthly_global}
-- columns into effective_month = 2026-01-01, so existing workers carry an
-- explicit baseline rate forward. Workers whose rate columns are all NULL
-- still get a row (with all NULLs) — the UI surfaces them as "no rate set"
-- via hasValidRate(), and the seed makes the lookup return *something*
-- deterministic rather than nothing.
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_rates (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id              uuid        NOT NULL REFERENCES staff(id),
  effective_month       date        NOT NULL,
  hourly_rate           numeric     NULL,
  daily_rate            numeric     NULL,
  monthly_global_salary numeric     NULL,
  created_by            text        NULL,  -- "admin:<name>" of whoever set it
  created_at            timestamptz NOT NULL DEFAULT now(),

  -- "1st of month" gate — Postgres date_trunc returns timestamp so we use
  -- the simpler equivalent: the day component must be 1.
  CONSTRAINT staff_rates_effective_month_is_first
    CHECK (EXTRACT(DAY FROM effective_month) = 1),

  -- One rate per worker per month — UPSERT semantics in the API.
  UNIQUE (staff_id, effective_month)
);

-- Hot-path lookup: for a given month M, fetch each worker's most recent
-- row whose effective_month ≤ M. The DESC sort lets us LIMIT 1 per
-- staff_id cheaply via the partial natural sort.
CREATE INDEX IF NOT EXISTS staff_rates_lookup_idx
  ON staff_rates (staff_id, effective_month DESC);

-- RLS enabled, no policies — same posture as the rest of the app. Server
-- queries use service_role (bypasses RLS); anon/authenticated get nothing.
ALTER TABLE staff_rates ENABLE ROW LEVEL SECURITY;

-- ── Seed: copy current staff rate columns into a January 2026 baseline ──
-- Skips workers whose three rate columns are all NULL — inserting an
-- all-NULL row there would be pure noise (the lookup would return it but
-- carry no useful values). Those workers are surfaced in the UI via the
-- ⚠️ "needs rate setup" flag instead, prompting the admin to enter a
-- proper rate from the worker edit form.
INSERT INTO staff_rates (staff_id, effective_month, hourly_rate, daily_rate, monthly_global_salary, created_by)
SELECT id, '2026-01-01'::date, hourly_rate, daily_rate, monthly_global_salary, 'seed:initial-2026-01'
FROM staff
WHERE active = true
  AND deleted_at IS NULL
  AND (hourly_rate IS NOT NULL
       OR daily_rate IS NOT NULL
       OR monthly_global_salary IS NOT NULL)
ON CONFLICT (staff_id, effective_month) DO NOTHING;
