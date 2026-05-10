-- =====================================================================
-- Migration: math_practice_progress
-- Tracks per-level practice progress, keyed by sync_key (device UUID)
-- consistent with math_test_attempts — no auth.users dependency.
-- Safe to re-run (idempotent).
-- =====================================================================

create table if not exists public.math_practice_progress (
  id                  uuid        primary key default gen_random_uuid(),
  sync_key            text        not null,
  module_slug         text        not null,
  level_id            text        not null,
  questions_total     integer     not null,
  questions_correct   integer     not null default 0,
  questions_answered  integer     not null default 0,
  -- shape: { "ab-l1-q1": { "correct": true, "selected": "א" }, ... }
  question_details    jsonb       not null default '{}'::jsonb,
  status              text        not null default 'in_progress'
                        check (status in ('in_progress', 'completed')),
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (sync_key, module_slug, level_id)
);

comment on table public.math_practice_progress is
  'Per-level practice progress for /math-app. Keyed by sync_key (device UUID), not auth.users.';

-- Index for the common query pattern: fetch all levels for one device+module
create index if not exists math_practice_progress_sync_module_idx
  on public.math_practice_progress (sync_key, module_slug);

-- updated_at trigger (reuses the function created in 20260504_math_test_attempts.sql)
drop trigger if exists math_practice_progress_set_updated_at on public.math_practice_progress;
create trigger math_practice_progress_set_updated_at
  before update on public.math_practice_progress
  for each row execute function public.set_updated_at();

-- ── RLS (mirrors math_test_attempts pattern) ──────────────────────────────────

alter table public.math_practice_progress enable row level security;

drop policy if exists "Practice progress select open"   on public.math_practice_progress;
drop policy if exists "Practice progress insert"        on public.math_practice_progress;
drop policy if exists "Practice progress update"        on public.math_practice_progress;

-- SELECT: open — query always filters by sync_key, same as math_test_attempts
create policy "Practice progress select open"
  on public.math_practice_progress for select
  using (true);

-- INSERT: require plausible sync_key (UUID = 36 chars; >=8 allows flexibility)
create policy "Practice progress insert"
  on public.math_practice_progress for insert
  with check (
    sync_key is not null
    and length(sync_key) >= 8
  );

-- UPDATE: sync_key must match the stored row value (prevents row hijacking)
create policy "Practice progress update"
  on public.math_practice_progress for update
  using (
    sync_key = (
      select sync_key
      from public.math_practice_progress p2
      where p2.id = math_practice_progress.id
    )
  )
  with check (
    sync_key = (
      select sync_key
      from public.math_practice_progress p2
      where p2.id = math_practice_progress.id
    )
  );

-- DELETE: sync_key must match the stored row value (allows reset)
drop policy if exists "Practice progress delete" on public.math_practice_progress;
create policy "Practice progress delete"
  on public.math_practice_progress for delete
  using (
    sync_key = (
      select sync_key
      from public.math_practice_progress p2
      where p2.id = math_practice_progress.id
    )
  );
