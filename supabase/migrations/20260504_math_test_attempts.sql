-- =====================================================================
-- Migration: Math Test Attempts
-- File: supabase/migrations/20260504_math_test_attempts.sql
-- Purpose: Track Bar-Ilan (and future) test attempts per sync_key.
--          Uses sync_key (text) instead of auth.users — matching the
--          existing math_profiles pattern (anon read/write, no Supabase Auth).
-- Run: Supabase Dashboard → SQL Editor. Idempotent (safe to re-run).
-- =====================================================================

-- 1. Main table
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
  -- { "q1": "א", "q2": "ג", ... }
  answers            jsonb       not null default '{}'::jsonb,
  -- { "order_of_operations": { "correct": 3, "total": 4 }, ... }
  topic_breakdown    jsonb,
  -- ordered list of question IDs presented (for randomised 24-of-30 simulations)
  question_ids       jsonb       not null default '[]'::jsonb,
  is_simulation      boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.math_test_attempts is
  'Bar-Ilan (and future) test attempts. Keyed by sync_key (device-local UUID), not auth.users.';

-- 2. Indexes
create index if not exists math_test_attempts_sync_key_idx
  on public.math_test_attempts (sync_key, completed_at desc);

create index if not exists math_test_attempts_test_idx
  on public.math_test_attempts (test_slug);

create index if not exists math_test_attempts_status_idx
  on public.math_test_attempts (status);

-- 3. updated_at trigger
-- set_updated_at() may already exist from another migration — use create or replace.
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

-- 4. Row-Level Security — anon read/write, matching math_profiles pattern
alter table public.math_test_attempts enable row level security;

drop policy if exists "anon read attempts"   on public.math_test_attempts;
drop policy if exists "anon insert attempts" on public.math_test_attempts;
drop policy if exists "anon update attempts" on public.math_test_attempts;

create policy "anon read attempts"
  on public.math_test_attempts for select using (true);

create policy "anon insert attempts"
  on public.math_test_attempts for insert with check (true);

create policy "anon update attempts"
  on public.math_test_attempts for update using (true);

-- 5. Progress summary view (best/avg score per sync_key + test)
create or replace view public.math_test_progress as
select
  sync_key,
  test_slug,
  count(*) filter (where status = 'completed')              as attempts_completed,
  count(*) filter (where status = 'in_progress')            as attempts_in_progress,
  max(score_percentage) filter (where status = 'completed') as best_score,
  round(
    avg(score_percentage) filter (where status = 'completed')::numeric,
    2
  )                                                         as avg_score,
  max(completed_at)                                         as last_attempt_at,
  min(started_at)                                           as first_attempt_at
from public.math_test_attempts
group by sync_key, test_slug;

-- =====================================================================
-- End of migration
-- =====================================================================
