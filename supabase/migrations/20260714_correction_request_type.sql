-- ============================================================
-- Binyan Eitan — Structured correction request types
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Until now a worker could only "fix the time" of an EXISTING row. A worker
-- who forgot to clock OUT had no way to ask for the missing exit — they were
-- forced to attach an evening time to their morning clock-IN, and approving
-- that overwrote the entry's clock_at → the whole shift vanished (0 hours).
--
-- This adds a structured request_type so the worker states WHAT happened, the
-- admin sees a translated label (not free text in the worker's language), and
-- the approval routes each type to the right action:
--   • fix_time      → rewrite the row's clock_at (existing behaviour)
--   • missing_exit  → INSERT a new exit, leave the entry untouched
--   • missing_entry → INSERT a new entry, leave the exit untouched
--
-- Explicit DEFAULT is written on purpose: attendance.status has an *undocumented*
-- default ('approved') that lives only in the DB — we do NOT repeat that mistake.
-- The default keeps the 5 existing pending rows valid as 'fix_time'.
-- ============================================================

ALTER TABLE attendance_corrections
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'fix_time'
    CHECK (request_type IN ('fix_time', 'missing_exit', 'missing_entry'));

COMMENT ON COLUMN attendance_corrections.request_type IS
  'What the worker is asking for: fix_time (rewrite existing row), missing_exit (add exit), missing_entry (add entry). Default fix_time = backward-compatible with pre-2026-07-14 rows.';
