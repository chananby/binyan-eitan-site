-- ============================================================
-- Binyan Eitan — staff.attendance_exempt: per-worker attendance opt-out
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Adds a single boolean: "this worker isn't expected to clock in/out".
-- Used so a manager on a global salary doesn't pollute the attendance
-- screen as a missing day every day. Kept independent of `role` because
-- the two are *almost* but not always aligned:
--   - the manager (role='מנהל') usually wants this on,
--   - a foreman (role='ממונה') may want this on if they don't clock,
--   - an admin may sometimes have a manager who still clocks in.
--
-- The flag affects display only — every existing attendance row stays
-- visible (in a separate "פטורים מנוכחות" group at the bottom of the
-- attendance screen), and the worker still counts in payroll if they
-- have a rate. NOT NULL DEFAULT false keeps every existing row well-
-- defined without needing a backfill.
-- ============================================================

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS attendance_exempt boolean NOT NULL DEFAULT false;
