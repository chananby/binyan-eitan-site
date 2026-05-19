-- ============================================================
-- Binyan Eitan — Align tasks schema with the API contract
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- Background
-- ----------
-- The public.tasks table was created manually in the Supabase dashboard
-- before the planning code shipped (commit 2e05444, 19 Mar 2026) and ended
-- up with a different column set than what the application uses. Inserts
-- from POST /api/admin/tasks fail with PGRST204
--    "Could not find the 'contractor' column of 'tasks' in the schema cache"
-- because five fields the API writes don't exist on the table.
--
-- Verified state at the time of this migration:
--   • tasks has 0 rows (no data to migrate or lose)
--   • Existing columns: id, project_id, milestone_id, name, title,
--     description, due_date, priority, planned_cost, status,
--     material_ready, sub_confirmed, equipment_on_site, delay_reason,
--     created_at, updated_at
--   • Missing columns (added below): task_name, start_date, end_date,
--     contractor, notes
--
-- The pre-existing columns (name, title, description, due_date, priority,
-- planned_cost) are intentionally left in place — removing them is not
-- reversible without a backup, and they are harmless when no code reads
-- or writes them. Future cleanup can drop them deliberately if it turns
-- out they are unused everywhere.
-- ============================================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_name  text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS end_date   date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS contractor text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes      text;
