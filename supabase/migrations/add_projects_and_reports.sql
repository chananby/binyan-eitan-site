-- ============================================================
-- Binyan Eitan — Project Management Migration
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Add project_id to attendance (nullable FK — old rows stay untouched)
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- 2. Add location column alias to projects if not already present
--    (The table already has `address`; this is informational — no action needed)

-- 3. Daily Reports table
CREATE TABLE IF NOT EXISTS daily_reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date          date        NOT NULL DEFAULT CURRENT_DATE,
  weather       text,
  summary       text,
  special_events text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 4. Materials log table
CREATE TABLE IF NOT EXISTS materials (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  daily_report_id  uuid        REFERENCES daily_reports(id) ON DELETE SET NULL,
  material_name    text        NOT NULL,
  quantity         numeric     NOT NULL DEFAULT 1,
  unit             text        NOT NULL DEFAULT 'יחידות',
  supplier         text,
  cost             numeric,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 5. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_project ON attendance(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_date ON daily_reports(project_id, date);
CREATE INDEX IF NOT EXISTS idx_materials_project ON materials(project_id);
CREATE INDEX IF NOT EXISTS idx_materials_report ON materials(daily_report_id);
