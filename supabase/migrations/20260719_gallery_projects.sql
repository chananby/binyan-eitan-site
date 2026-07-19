-- ============================================================
-- Binyan Eitan — Marketing gallery PROJECTS (admin manager, round 2, part A)
-- Run once in Supabase SQL Editor. Run BEFORE the content migration
-- (20260719_gallery_content_migration.sql).
-- ============================================================
-- Round 1 gave us gallery_images (per-image rows). Round 2 adds the PROJECT
-- level so Chanan can add/edit projects (title, description, categories, cover,
-- order) fully in-admin — today the 5 projects are hard-coded in
-- GALLERY_PROJECTS (src/lib/projects.ts) and 5 more can't be added without a
-- code edit + deploy.
--
-- This table mirrors the GalleryProject type. Beyond the fields the task named
-- it also carries category_he/category_en (the display label shown on the card
-- chip + lightbox) and aspect (masonry card height) — both are rendered on the
-- public site, so dropping them would change the live look.
--
-- slug is the stable key and MATCHES gallery_images.project_slug (= the old
-- GALLERY_PROJECTS[].id, e.g. "amshinov"). No FK is declared so a stray image
-- row can't block a project delete; the join is by slug in the API.
--
-- EXPLICIT DEFAULTS on every column, in the open (the attendance.status lesson).
-- ============================================================

CREATE TABLE IF NOT EXISTS gallery_projects (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text        NOT NULL UNIQUE,          -- = gallery_images.project_slug
  url_slug       text        NOT NULL DEFAULT '',      -- detail-page URL segment
  title_he       text        NOT NULL DEFAULT '',
  title_en       text        NOT NULL DEFAULT '',
  category_he    text        NOT NULL DEFAULT '',      -- display label (card chip / lightbox)
  category_en    text        NOT NULL DEFAULT '',
  description_he text        NOT NULL DEFAULT '',      -- shortDesc
  description_en text        NOT NULL DEFAULT '',
  categories     text[]      NOT NULL DEFAULT '{}',    -- filter tags (renovations/finish/…)
  aspect         text        NOT NULL DEFAULT '4/3',   -- masonry card height (4/3|3/4|16/9|1/1)
  sort_order     integer     NOT NULL DEFAULT 0,       -- gallery order (asc)
  is_published   boolean     NOT NULL DEFAULT true,    -- false = hidden from the public site
  created_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz                           -- soft-delete (NULL = live)
);

CREATE INDEX IF NOT EXISTS gallery_projects_order_idx
  ON gallery_projects (sort_order)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE gallery_projects IS
  'Marketing-gallery projects for the admin manager (round 2). slug matches gallery_images.project_slug. The public /projects gallery reads this + gallery_images, falling back to the hard-coded GALLERY_PROJECTS array in src/lib/projects.ts if the query fails.';
COMMENT ON COLUMN gallery_projects.slug IS
  'Stable key = old GALLERY_PROJECTS[].id (e.g. "amshinov"); joins to gallery_images.project_slug.';
COMMENT ON COLUMN gallery_projects.is_published IS
  'false hides the project from the public site but keeps it in the admin manager.';
