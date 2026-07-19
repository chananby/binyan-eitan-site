-- ============================================================
-- Binyan Eitan — Marketing gallery images (admin manager, round 1)
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================
-- Until now every marketing-gallery image required a file committed to
-- /public plus a hand-edit of lib/projects.ts (the hard-coded GALLERY_PROJECTS
-- array) + a deploy. This table backs a new in-admin gallery manager: images
-- are uploaded to Vercel Blob and catalogued here, so Chanan can add dozens
-- without touching code.
--
-- ROUND 1 SCOPE: management only. The PUBLIC gallery STILL renders from the
-- hard-coded array in lib/projects.ts — nothing here is read by the public
-- site yet. Round 2 migrates the public gallery to read this table (and
-- back-fills the 78 existing images). This staging keeps the live site safe.
--
-- project_slug matches GALLERY_PROJECTS[].id (the short stable key, e.g.
-- "amshinov", "bayit-vegan") — NOT urlSlug — so round 2 can join on it.
--
-- EXPLICIT DEFAULTS on every relevant column are written on purpose: the
-- lesson from attendance.status is that an *undocumented* DB-only default is
-- a latent trap. Here every default lives in this migration, in the open.
-- ============================================================

CREATE TABLE IF NOT EXISTS gallery_images (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_slug text        NOT NULL,
  url          text        NOT NULL,               -- Vercel Blob public URL
  sort_order   integer     NOT NULL DEFAULT 0,     -- position within the project (asc)
  is_cover     boolean     NOT NULL DEFAULT false, -- masonry card thumbnail (<=1 per project)
  category     text,                               -- optional filter tag (nullable)
  alt_he       text,                               -- optional alt text (nullable)
  alt_en       text,                               -- optional alt text (nullable)
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz                         -- soft-delete (NULL = live)
);

-- Fast per-project ordered lookups, live rows only.
CREATE INDEX IF NOT EXISTS gallery_images_project_idx
  ON gallery_images (project_slug, sort_order)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE gallery_images IS
  'Marketing-gallery images uploaded via the admin gallery manager (round 1). URL points at Vercel Blob (gallery/ prefix). Round 1 = management only; the public site still reads the hard-coded lib/projects.ts array until round 2 migrates it here.';
COMMENT ON COLUMN gallery_images.project_slug IS
  'Matches GALLERY_PROJECTS[].id in src/lib/projects.ts (short key, e.g. "amshinov"), not urlSlug.';
COMMENT ON COLUMN gallery_images.is_cover IS
  'At most one live cover per project_slug is intended; enforced in the API (PATCH clears siblings), not by a DB constraint.';
