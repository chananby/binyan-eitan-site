-- ============================================================
-- Binyan Eitan — Attendance edit-audit trail + soft delete
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Adds five columns to attendance:
--   edited_by         — who made the last edit ('admin:<name>' / 'foreman:<name>')
--   edited_at         — when the last edit happened
--   edit_note         — optional free-text reason for the edit
--   original_clock_at — the clock_at value *before* the first edit.
--                       Written once (when clock_at first changes), then
--                       never overwritten, so we always have the as-clocked
--                       truth alongside the admin-corrected one.
--   deleted_at        — soft delete. NULL = active, timestamp = removed.
--
-- All five are nullable with no default — existing rows get NULL on backfill,
-- which is exactly what we want (they were never edited / never deleted).
--
-- Partial index on (deleted_at) WHERE NULL accelerates the very common
-- "active rows only" filter that today/recent/pending/report/payroll all use.
--
-- No GRANTs needed: attendance has RLS enabled with no policies, so anon &
-- authenticated roles get zero access; our server queries via service_role
-- (bypasses RLS) and inherits column-level access from the table grant.
-- New columns inherit the existing table-level access automatically.
-- ============================================================

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS edited_by         TEXT        NULL,
  ADD COLUMN IF NOT EXISTS edited_at         TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS edit_note         TEXT        NULL,
  ADD COLUMN IF NOT EXISTS original_clock_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ NULL;

-- Hot-path: today/recent/pending/report/payroll all filter deleted_at IS NULL.
-- Partial index keeps the index tiny and writes cheap.
CREATE INDEX IF NOT EXISTS attendance_deleted_at_idx
  ON public.attendance (deleted_at)
  WHERE deleted_at IS NULL;
