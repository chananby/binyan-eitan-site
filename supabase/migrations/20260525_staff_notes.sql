-- ============================================================
-- Binyan Eitan — Free-text notes per staff member
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Adds an optional free-form notes field to the staff table.
-- Used in the admin form for any HR/operational context the
-- admin wants to remember about a worker — uniform availability,
-- equipment quirks, family situations, anything that doesn't fit
-- the structured fields. NULL for existing rows.
-- ============================================================

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS notes TEXT NULL;
