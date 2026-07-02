-- ============================================================
-- Binyan Eitan — B2 race UNIQUE index (STEP 2 of 2)
--
-- Closes the TOCTOU race in POST /api/attendance: two concurrent
-- clock-in requests both pass the app-layer "already clocked in"
-- guard (read), then both INSERT with the same server-stamped
-- clock_at (write). The partial UNIQUE catches the collision at
-- the DB layer so the second INSERT fails with 23505 instead of
-- landing a duplicate row.
--
-- Scope: soft-deleted rows are excluded — an admin who deletes a
-- mis-clocked row and reinserts a corrected one at the same
-- clock_at won't hit a phantom conflict.
--
-- Also protects the admin manual-entry form from its own double-
-- submit bug (5 confirmed collision groups in production, all
-- is_manual=true).
--
-- PRE-CONDITION: 20260702_attendance_race_dedup.sql must have run
-- successfully. If duplicate live rows remain in
-- (staff_id, action, clock_at), CREATE UNIQUE INDEX fails.
--
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS attendance_staff_action_clockat_unique
  ON public.attendance (staff_id, action, clock_at)
  WHERE deleted_at IS NULL;
