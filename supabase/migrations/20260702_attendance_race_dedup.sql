-- ============================================================
-- Binyan Eitan — B2 race dedup (STEP 1 of 2)
--
-- Soft-deletes the 6 duplicate rows blocking the (staff_id, action,
-- clock_at) UNIQUE index. Each row listed is the LATER-created sibling
-- in a collision group; the first-created row is kept as the winner.
--
-- MUST RUN BEFORE 20260702_attendance_race_unique.sql —
-- otherwise CREATE UNIQUE INDEX fails with:
--   "could not create unique index … Key is duplicated."
--
-- Sources of the duplicates (all is_manual=true — admin manual-entry
-- form double-submits, NOT worker clock-in races):
--   • שחר תובל     out 2026-06-23 18:00 — admin resubmit 79s later
--   • ישראל שם טוב in  2026-06-14 08:15 — admin re-entered 2 days later
--   • דניאל אליהו  out 2026-04-28 17:00 — admin resubmit 52s later
--   • סוחרוב        in  2026-07-02 07:00 — admin resubmit ~13h later (today)
--   • סוחרוב        out 2026-07-02 17:00 — admin triple-submit within 4min
--
-- Once B3 code lands, worker-side races are also blocked at the DB;
-- admin-form double-submits will continue to be caught here.
--
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================

UPDATE public.attendance
SET
  deleted_at = now(),
  edited_at  = now(),
  edited_by  = 'system:B2-race-dedup',
  edit_note  = coalesce(edit_note, '') || ' [B2 race dedup — soft-deleted duplicate for UNIQUE index]'
WHERE id IN (
  -- Group 1: שחר תובל, out, 2026-06-23 18:00 — keep 5edda03e, drop this.
  'af6a13e5-5a89-4bd8-b7d3-bea55a436edf',

  -- Group 2: ישראל שם טוב, in, 2026-06-14 08:15 — keep bf7ed02e, drop this.
  'df23841c-db46-410f-89eb-c08c82aee82b',

  -- Group 3: דניאל אליהו, out, 2026-04-28 17:00 — keep d6486851, drop this.
  '644dd157-5b08-4b32-8679-5d2fe67f6c5e',

  -- Group 4: סוחרוב, in, 2026-07-02 07:00 — keep 0b68a39e, drop this.
  'c6651709-a087-49db-988e-048f292b2ebd',

  -- Group 5: סוחרוב, out, 2026-07-02 17:00 (3 rows total).
  --   Keep 5500bd5a (earliest); drop the two later ones.
  'f08f09d9-efdc-41ad-9ca2-cfd2dc3a60af',
  'd26e63e4-b360-4ad5-89c3-5463a94c1e67'
);

-- Post-check — the following MUST return 0 rows before continuing to
-- the UNIQUE index migration. If it returns >0, a new collision was
-- created between the SELECT that produced the id list and this UPDATE
-- (unlikely but possible on a live system) — re-run the dedup probe
-- and regenerate the id list.
--
-- SELECT staff_id, action, clock_at, count(*)
-- FROM public.attendance
-- WHERE deleted_at IS NULL
-- GROUP BY staff_id, action, clock_at
-- HAVING count(*) > 1;
