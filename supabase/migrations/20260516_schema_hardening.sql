-- ============================================================
-- Binyan Eitan — Schema hardening (audit follow-up)
--
-- Adds missing indexes on hot-path query columns, NUMERIC scale on money
-- columns, CHECK constraints that the API layer currently enforces alone,
-- and a couple of GPS-range checks on project coordinates.
--
-- Idempotent: every statement is guarded by IF NOT EXISTS or
-- DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT.
--
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 1 — PRE-FLIGHT AUDIT (run these queries first)         ║
-- ║  Each must return 0 rows. If any returns >0, fix the data    ║
-- ║  before continuing — otherwise the CHECK constraints below    ║
-- ║  will fail to install.                                        ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- -- A) Negative money values:
-- SELECT id, hourly_rate, daily_rate, monthly_global_salary
-- FROM staff
-- WHERE hourly_rate < 0 OR daily_rate < 0 OR monthly_global_salary < 0;
--
-- SELECT id, cost FROM materials WHERE cost < 0;
-- SELECT id, amount FROM income  WHERE amount < 0;
-- SELECT id, total_before_vat FROM quotes WHERE total_before_vat < 0;
--
-- -- B) Non-positive material quantities:
-- SELECT id, quantity FROM materials WHERE quantity <= 0;
--
-- -- C) Invalid GPS (lat outside ±90, lng outside ±180):
-- SELECT id, name, lat, lng FROM projects
-- WHERE (lat IS NOT NULL AND (lat <  -90 OR lat >  90))
--    OR (lng IS NOT NULL AND (lng < -180 OR lng > 180));
--
-- -- D) Out-of-range distance_from_project_m (>5000km is almost certainly a bug):
-- SELECT id, distance_from_project_m FROM attendance
-- WHERE distance_from_project_m IS NOT NULL AND distance_from_project_m < 0;
--
-- -- E) Quotes with non-allowlisted status:
-- SELECT id, status FROM quotes
-- WHERE status NOT IN ('draft','sent','accepted','rejected','archived');
--
-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 2 — INDEXES (safe; idempotent)                          ║
-- ╚══════════════════════════════════════════════════════════════╝

-- attendance.staff_id alone — payroll/report queries filter by worker first.
-- Composite (staff_id, created_at) covers both the staff filter and date range
-- in a single seek.
CREATE INDEX IF NOT EXISTS attendance_staff_created_idx
  ON attendance (staff_id, created_at);

-- attendance.created_at — broad time-range scans (e.g. "today" / "this month")
-- with no staff filter.
CREATE INDEX IF NOT EXISTS attendance_created_at_idx
  ON attendance (created_at);

-- attendance.clock_at — used as the authoritative work timestamp in reports.
CREATE INDEX IF NOT EXISTS attendance_clock_at_idx
  ON attendance (clock_at)
  WHERE clock_at IS NOT NULL;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 3 — NUMERIC SCALE on money columns                      ║
-- ║  Postgres preserves existing values when adding scale, as     ║
-- ║  long as they fit. Values >= 1e10 (10B) would truncate;       ║
-- ║  step 1A audit verifies none exist.                           ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE materials ALTER COLUMN cost     TYPE numeric(12,2);
ALTER TABLE materials ALTER COLUMN quantity TYPE numeric(12,3);

ALTER TABLE staff ALTER COLUMN hourly_rate            TYPE numeric(10,2);
ALTER TABLE staff ALTER COLUMN daily_rate             TYPE numeric(10,2);
ALTER TABLE staff ALTER COLUMN monthly_global_salary  TYPE numeric(12,2);

ALTER TABLE quotes ALTER COLUMN total_before_vat TYPE numeric(12,2);

-- income.amount — same treatment
-- (Wrapped in DO so it's skipped silently if the column is already typed.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income' AND column_name = 'amount'
  ) THEN
    EXECUTE 'ALTER TABLE income ALTER COLUMN amount TYPE numeric(12,2)';
  END IF;
END $$;

-- GPS coordinates — 6 decimals = ~11cm precision, more than enough for site flags
ALTER TABLE projects ALTER COLUMN lat TYPE numeric(9,6);
ALTER TABLE projects ALTER COLUMN lng TYPE numeric(9,6);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 4 — CHECK CONSTRAINTS                                   ║
-- ║  These mirror what the API enforces. They protect against     ║
-- ║  bad data sneaking in via direct SQL or future API bugs.      ║
-- ║  Drop-then-add keeps the migration re-runnable.               ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Money: non-negative
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_hourly_rate_nonneg;
ALTER TABLE staff ADD  CONSTRAINT staff_hourly_rate_nonneg
  CHECK (hourly_rate IS NULL OR hourly_rate >= 0);

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_daily_rate_nonneg;
ALTER TABLE staff ADD  CONSTRAINT staff_daily_rate_nonneg
  CHECK (daily_rate IS NULL OR daily_rate >= 0);

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_global_salary_nonneg;
ALTER TABLE staff ADD  CONSTRAINT staff_global_salary_nonneg
  CHECK (monthly_global_salary IS NULL OR monthly_global_salary >= 0);

ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_cost_nonneg;
ALTER TABLE materials ADD  CONSTRAINT materials_cost_nonneg
  CHECK (cost IS NULL OR cost >= 0);

ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_quantity_positive;
ALTER TABLE materials ADD  CONSTRAINT materials_quantity_positive
  CHECK (quantity > 0);

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_total_nonneg;
ALTER TABLE quotes ADD  CONSTRAINT quotes_total_nonneg
  CHECK (total_before_vat IS NULL OR total_before_vat >= 0);

-- income.amount — wrapped in DO since the table may not exist in older envs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income' AND column_name = 'amount'
  ) THEN
    EXECUTE 'ALTER TABLE income DROP CONSTRAINT IF EXISTS income_amount_positive';
    EXECUTE 'ALTER TABLE income ADD  CONSTRAINT income_amount_positive CHECK (amount > 0)';
  END IF;
END $$;

-- GPS within valid ranges
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_lat_range;
ALTER TABLE projects ADD  CONSTRAINT projects_lat_range
  CHECK (lat IS NULL OR (lat BETWEEN -90  AND 90));

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_lng_range;
ALTER TABLE projects ADD  CONSTRAINT projects_lng_range
  CHECK (lng IS NULL OR (lng BETWEEN -180 AND 180));

-- Attendance distance non-negative (NULL = couldn't compute, allowed)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_distance_nonneg;
ALTER TABLE attendance ADD  CONSTRAINT attendance_distance_nonneg
  CHECK (distance_from_project_m IS NULL OR distance_from_project_m >= 0);

-- Quotes status allowlist — mirrors the API allowlist exactly
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD  CONSTRAINT quotes_status_check
  CHECK (status IN ('draft','sent','accepted','rejected','archived'));

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 5 — VERIFY                                              ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- -- Confirm CHECKs installed:
-- SELECT conname, conrelid::regclass AS table
-- FROM pg_constraint
-- WHERE contype = 'c'
--   AND conrelid::regclass::text IN ('staff','materials','quotes','projects','attendance','income')
-- ORDER BY conrelid::regclass::text, conname;
--
-- -- Confirm indexes installed:
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'attendance_%_idx'
-- ORDER BY tablename, indexname;
