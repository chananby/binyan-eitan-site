-- =============================================================================
-- RLS Migration — Block anonymous access on all app tables
-- =============================================================================
-- WHEN TO RUN: Once, in Supabase Dashboard → SQL Editor
-- EFFECT:      Anon key cannot read/write any row directly.
--              Server-side API uses SUPABASE_SERVICE_ROLE_KEY which bypasses
--              RLS — no change to existing app behavior.
-- WHY:         Defense-in-depth: if someone discovers SUPABASE_URL + ANON_KEY
--              they still cannot access any data.
-- =============================================================================

-- ── Core attendance tables ────────────────────────────────────────────────────

ALTER TABLE public.staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plan     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income          ENABLE ROW LEVEL SECURITY;

-- ── Deny all anon access ──────────────────────────────────────────────────────
-- One policy per table: SELECT / INSERT / UPDATE / DELETE all blocked for anon.

CREATE POLICY "deny_anon" ON public.staff
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "deny_anon" ON public.attendance
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "deny_anon" ON public.projects
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "deny_anon" ON public.tasks
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "deny_anon" ON public.daily_reports
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "deny_anon" ON public.materials
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "deny_anon" ON public.budget_items
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "deny_anon" ON public.settings
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "deny_anon" ON public.milestones
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "deny_anon" ON public.weekly_plan
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "deny_anon" ON public.income
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- =============================================================================
-- VERIFY (run after migration):
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' ORDER BY tablename;
--
-- All rows should show rowsecurity = true.
-- =============================================================================
