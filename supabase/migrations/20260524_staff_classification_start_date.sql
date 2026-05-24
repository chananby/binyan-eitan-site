-- ============================================================
-- Binyan Eitan — Staff classification + start date
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Adds two fields used by the staff form:
--   is_freelancer  — distinguishes employee (false) from freelancer/
--                    contractor (true). Drives the "travel allowance"
--                    default in the add-worker form (employees default
--                    to יש נסיעות, freelancers to אין).
--   start_date     — when the worker started employment. Optional,
--                    NULL for existing rows (no backfill — created_at
--                    isn't a reliable hire date in most cases).
-- ============================================================

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS is_freelancer BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS start_date DATE NULL;
