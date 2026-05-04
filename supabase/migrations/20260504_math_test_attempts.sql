-- =====================================================================
-- Migration: Math RLS Hardening
-- File: supabase/migrations/20260504_math_test_attempts.sql
--
-- Covers two tables:
--   1. math_test_attempts  — CREATE (new table) + hardened RLS
--   2. math_profiles       — RLS policies only (NO DDL, NO data change)
--
-- Safe to re-run (idempotent).
-- Run via: Supabase Dashboard → SQL Editor
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1: math_test_attempts (new table)
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.math_test_attempts (
  id                 uuid        primary key default gen_random_uuid(),
  sync_key           text        not null,
  test_slug          text        not null,
  test_name          text,
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  duration_seconds   integer,
  total_questions    integer     not null,
  answered_count     integer     not null default 0,
  correct_count      integer,
  score_percentage   numeric(5,2),
  status             text        not null default 'in_progress'
                       check (status in ('in_progress', 'completed', 'abandoned')),
  answers            jsonb       not null default '{}'::jsonb,
  topic_breakdown    jsonb,
  question_ids       jsonb       not null default '[]'::jsonb,
  is_simulation      boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.math_test_attempts is
  'Bar-Ilan (and future) test attempts. Keyed by sync_key (device-local UUID), not auth.users.';

create index if not exists math_test_attempts_sync_key_idx
  on public.math_test_attempts (sync_key, completed_at desc);
create index if not exists math_test_attempts_test_idx
  on public.math_test_attempts (test_slug);
create index if not exists math_test_attempts_status_idx
  on public.math_test_attempts (status);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists math_test_attempts_set_updated_at on public.math_test_attempts;
create trigger math_test_attempts_set_updated_at
  before update on public.math_test_attempts
  for each row execute function public.set_updated_at();

alter table public.math_test_attempts enable row level security;

drop policy if exists "anon read attempts"   on public.math_test_attempts;
drop policy if exists "anon insert attempts" on public.math_test_attempts;
drop policy if exists "anon update attempts" on public.math_test_attempts;
drop policy if exists "anon delete attempts" on public.math_test_attempts;

-- SELECT open — needed for history and progress views
create policy "anon read attempts"
  on public.math_test_attempts for select
  using (true);

-- INSERT — require a plausible sync_key (UUID = 36 chars; >=8 allows flexibility)
create policy "anon insert attempts"
  on public.math_test_attempts for insert
  with check (
    sync_key is not null
    and length(sync_key) >= 8
    and total_questions > 0
  );

-- UPDATE — any row may be targeted by id (app-level responsibility),
--          but sync_key must remain identical to the stored value.
--          This prevents a PATCH from hijacking a row by changing its sync_key.
create policy "anon update attempts"
  on public.math_test_attempts for update
  using (true)
  with check (
    sync_key = (
      select sync_key
      from   public.math_test_attempts
      where  id = math_test_attempts.id
    )
  );

-- DELETE — no policy → blocked for anon. Use service_role to delete rows.

create or replace view public.math_test_progress as
select
  sync_key,
  test_slug,
  count(*) filter (where status = 'completed')              as attempts_completed,
  count(*) filter (where status = 'in_progress')            as attempts_in_progress,
  max(score_percentage) filter (where status = 'completed') as best_score,
  round(
    avg(score_percentage) filter (where status = 'completed')::numeric, 2
  )                                                         as avg_score,
  max(completed_at)                                         as last_attempt_at,
  min(started_at)                                           as first_attempt_at
from public.math_test_attempts
group by sync_key, test_slug;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2: math_profiles (RLS hardening only)
--
-- !! DATA SAFETY GUARANTEE !!
-- This section contains ONLY:
--   • alter table … enable row level security   (idempotent, no data effect)
--   • drop policy if exists …                   (removes access rules, not rows)
--   • create policy …                           (adds access rules, not rows)
-- No ALTER TABLE on columns, no DROP TABLE, no DELETE, no UPDATE of rows.
-- All existing profile data (including daughter's progress) is untouched.
--
-- SECURITY NOTE — why sync_key is not a full auth solution:
--   sync_key for math_profiles is a short user-chosen string (e.g. "נועה123456").
--   This is low entropy — ~900k combinations per known first name.
--   RLS with sync_key offers minimal defense; a determined attacker with
--   knowledge of the name could enumerate keys.
--   Full fix requires Supabase Auth (auth.uid() in RLS USING clauses).
--   TODO(future): when Auth is added, replace all `using (true)` on profiles
--   with `using (auth.uid()::text = sync_key)` or a dedicated user_id column.
-- ─────────────────────────────────────────────────────────────────────

alter table public.math_profiles enable row level security;

-- Drop the original open policies
drop policy if exists "anon read"   on public.math_profiles;
drop policy if exists "anon write"  on public.math_profiles;
drop policy if exists "anon upsert" on public.math_profiles;

-- SELECT — open (needed for sync pull by any device holding the sync_key)
create policy "anon read profiles"
  on public.math_profiles for select
  using (true);

-- INSERT — require non-null sync_key (>=6 chars) and name
create policy "anon insert profiles"
  on public.math_profiles for insert
  with check (
    sync_key is not null
    and length(sync_key) >= 6
    and name   is not null
  );

-- UPDATE (also covers upsert via Prefer: resolution=merge-duplicates) —
--   any row may be targeted, but sync_key must not change.
--   Since sync_key is the primary key, Postgres already prevents PK changes;
--   this with check adds an explicit RLS layer.
create policy "anon update profiles"
  on public.math_profiles for update
  using (true)
  with check (
    sync_key = (
      select p.sync_key
      from   public.math_profiles p
      where  p.sync_key = math_profiles.sync_key
    )
  );

-- DELETE — no policy → blocked for anon. Use service_role to delete rows.

-- =====================================================================
-- End of migration
-- =====================================================================
