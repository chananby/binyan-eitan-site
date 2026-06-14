-- 20260615_project_budget.sql
-- ============================================================
-- Binyan Eitan — per-project budget (for "תקציב מול ביצוע")
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- A single budget figure per project. NULLABLE on purpose: existing projects
-- stay NULL, meaning "no budget defined" (rendered as "לא הוגדר תקציב", NOT as
-- ₪0) — so percent-spent / remaining are simply not computed until a budget is
-- set.
--
-- This is the ONLY budget source for the feature. The dormant budget_items
-- table is intentionally left untouched.
-- ============================================================

ALTER TABLE projects ADD COLUMN budget numeric(12,2);
