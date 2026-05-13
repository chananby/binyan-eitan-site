-- ============================================================
-- Binyan Eitan — Payroll fields (Sprint 1.a)
-- Adds employment_type, monthly_global_salary, travel_allowance,
-- pension_status, holiday_eligible to the staff table.
-- Creates vacation_days table for tracking vacation usage per worker.
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================

-- 1. Add new staff fields (idempotent — IF NOT EXISTS guards re-running)

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS employment_type        text         NOT NULL DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS monthly_global_salary  numeric,
  ADD COLUMN IF NOT EXISTS travel_allowance       boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pension_status         text,
  ADD COLUMN IF NOT EXISTS holiday_eligible       boolean      NOT NULL DEFAULT true;

-- Restrict employment_type to known values (CHECK is idempotent via DROP+ADD)
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_employment_type_check;
ALTER TABLE staff
  ADD CONSTRAINT staff_employment_type_check
  CHECK (employment_type IN ('hourly', 'daily', 'global'));

-- 2. Vacation tracking — one row per vacation day per worker

CREATE TABLE IF NOT EXISTS vacation_days (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    uuid        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  half_day    boolean     NOT NULL DEFAULT false,
  notes       text,
  created_by  uuid        REFERENCES admins(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, date)
);

-- Hot-path lookup: aggregate vacation in a given month per worker
CREATE INDEX IF NOT EXISTS vacation_days_staff_date_idx
  ON vacation_days (staff_id, date);

-- RLS: leave off (server-only access via service_role) — matches pattern
-- of staff, attendance, etc. Security enforced in API routes.
