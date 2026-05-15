-- ============================================================
-- Binyan Eitan — GPS-based attendance verification (Sprint: location)
--
-- Adds project coordinates (lat/lng) so the system can flag
-- attendance records taken too far from the project site.
-- Distance is computed server-side at clock-in/out and stored on
-- the attendance row.
-- ============================================================

-- 1. Project coordinates
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

-- 2. Per-attendance distance (meters from project at submission time).
-- NULL = couldn't compute (project has no coords, or worker had no project).
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS distance_from_project_m integer;

-- 3. Index for filtering / counting flagged records efficiently
CREATE INDEX IF NOT EXISTS attendance_distance_idx
  ON attendance (distance_from_project_m)
  WHERE distance_from_project_m IS NOT NULL;
