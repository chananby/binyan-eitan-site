-- ============================================================
-- Binyan Eitan — Backfill: distance_from_project_m on historical attendance
--
-- Computes Haversine distance for every attendance row that:
--   (1) has lat/lng (always true since GPS was mandatory from day one)
--   (2) is linked to a project that has its own lat/lng
--   (3) doesn't yet have distance_from_project_m (NULL)
--
-- Idempotent: re-runnable after additional projects get geocoded.
-- Rows without project_id, or whose project has no coords, stay NULL —
-- the UI shows a neutral pin for those.
-- ============================================================

UPDATE attendance a
SET distance_from_project_m = ROUND(
  6371000 * 2 * ASIN(LEAST(1.0, SQRT(
    POWER(SIN(RADIANS((p.lat - a.lat::numeric) / 2)), 2) +
    COS(RADIANS(a.lat::numeric)) * COS(RADIANS(p.lat)) *
    POWER(SIN(RADIANS((p.lng - a.lng::numeric) / 2)), 2)
  )))
)::integer
FROM projects p
WHERE a.project_id = p.id
  AND a.distance_from_project_m IS NULL
  AND a.lat IS NOT NULL AND a.lat <> ''
  AND a.lng IS NOT NULL AND a.lng <> ''
  AND p.lat IS NOT NULL
  AND p.lng IS NOT NULL;
