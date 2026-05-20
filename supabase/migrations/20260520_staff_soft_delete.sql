-- ============================================================
-- Binyan Eitan — Soft-delete support for staff
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Adds a deleted_at column so that "deleted" workers vanish
-- from admin/foreman views while their attendance history
-- stays intact for payroll archives.
--
-- Deletion contract (enforced in the API):
--   • Only workers with active = false can be soft-deleted.
--   • Soft delete sets deleted_at = NOW(); never hard-deletes.
--   • All GETs filter `deleted_at IS NULL` so deleted rows are
--     hidden everywhere except in retrospective payroll reports.
--
-- The partial index accelerates the very common
-- `WHERE deleted_at IS NULL` predicate without bloating writes.
-- ============================================================

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS staff_deleted_at_idx
  ON public.staff (deleted_at)
  WHERE deleted_at IS NULL;
