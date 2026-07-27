-- ============================================================
-- Binyan Eitan — document attendance.status DEFAULT 'approved'
--
-- attendance.status has DEFAULT 'approved' in the LIVE database, but
-- the table predates the migration regime so no migration records it.
-- A rebuild-from-migrations would create the column WITHOUT a default
-- → live clock-ins land with status = NULL → payroll and every query
-- that filters by status break silently.
--
-- Who relies on the default today (writes NO explicit status):
--   • POST /api/attendance             (worker app clock in/out)
--   • insertPhoneAttendance            (Twilio IVR)
--   • POST /admin/attendance/clock-out (admin "השלם יציאה")
-- Who already writes it explicitly (unchanged):
--   • /admin/attendance/manual         — 'pending' (foreman) / 'approved' (admin)
--   • /admin/attendance/corrections    — 'approved'
--
-- This migration ONLY re-declares the existing default. It does NOT
-- touch any data. Idempotent: if the default is already 'approved'
-- this is a no-op.
--
-- Companion change: the three routes above now ALSO write
-- status:'approved' explicitly in code (same value the default gives),
-- so behaviour no longer depends on this default — it is a safety net.
--
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================

ALTER TABLE attendance ALTER COLUMN status SET DEFAULT 'approved';

COMMENT ON COLUMN attendance.status IS
  'Row lifecycle state. approved = counted live (worker app / Twilio / admin clock-out / admin manual / correction approvals); pending = foreman manual entry awaiting admin review. DEFAULT approved. As of 2026-07-27 every insert path writes this explicitly in code, so the default is a safety net, not the source of truth.';

-- ── OPTIONAL follow-up: NOT NULL ─────────────────────────────
-- Consider only AFTER confirming there are ZERO NULLs. Chanan: run
-- this check FIRST, on its own:
--
--   SELECT count(*) AS null_status_rows
--   FROM attendance
--   WHERE status IS NULL;
--
-- • If null_status_rows = 0 → you MAY additionally run:
--       ALTER TABLE attendance ALTER COLUMN status SET NOT NULL;
-- • If null_status_rows > 0 → STOP. Do NOT force NOT NULL. Decide how
--   to backfill those rows first (they'd have been written before the
--   default existed, or by some path we haven't mapped).
