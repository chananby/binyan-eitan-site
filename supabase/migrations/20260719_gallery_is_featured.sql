-- ============================================================
-- Binyan Eitan — Home-page showcase flag for gallery projects
-- Run once in Supabase SQL Editor, AFTER 20260719_gallery_projects.sql.
-- ============================================================
-- The home page (PortfolioGallery) rendered its own hard-coded PROJECTS array,
-- so projects Chanan adds in the admin showed up on /he/projects but NOT on the
-- home page. Rather than show everything there (too busy), he picks per project.
--
-- is_featured = "show this one in the home-page showcase". The public gallery
-- keeps using is_published; the home page needs BOTH is_featured AND
-- is_published, so unpublishing a project also pulls it off the home page.
--
-- EXPLICIT DEFAULT false: a newly added project is NOT put on the home page
-- until Chanan ticks the box — adding a project can never silently change the
-- most important page on the site.
-- ============================================================

ALTER TABLE gallery_projects
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN gallery_projects.is_featured IS
  'Show in the home-page showcase (PortfolioGallery). Requires is_published too. Default false so new projects never appear on the home page unintentionally.';

-- Back-fill: mark exactly the 5 projects the hard-coded home-page PROJECTS
-- array shows today, in its order, so the home page looks IDENTICAL after the
-- switch — no surprises. (Verified against PortfolioGallery's PROJECTS covers
-- and series: amshinov, bayit-vegan, ohel-avshalom, ramat-eshkol,
-- jerusalem-luxury — i.e. all five originals; the newer projects Chanan added
-- stay off the home page until he opts them in.)
UPDATE gallery_projects
   SET is_featured = true
 WHERE slug IN ('amshinov', 'bayit-vegan', 'ohel-avshalom', 'ramat-eshkol', 'jerusalem-luxury')
   AND deleted_at IS NULL;
