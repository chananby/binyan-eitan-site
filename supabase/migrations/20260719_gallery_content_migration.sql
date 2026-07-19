-- ============================================================
-- Binyan Eitan — Gallery content migration (round 2, part B)
-- Run once in Supabase SQL Editor, AFTER 20260719_gallery_projects.sql.
-- ============================================================
-- Imports the 5 hard-coded projects and their 73 images from GALLERY_PROJECTS
-- (src/lib/projects.ts) into gallery_projects + gallery_images, so the public
-- gallery can read them from the DB.
--
--   • Each project → one gallery_projects row (texts, categories, aspect,
--     sort_order by array position, is_published=true).
--   • Each image → one gallery_images row with url = the CURRENT /public path
--     (e.g. /amshinov-1.jpg). Images stay in /public — only the catalogue moves
--     to the DB this round (Blob re-upload + /public cleanup are a later step).
--   • is_cover marks the project's cover. Two projects (bayit-vegan,
--     ohel-avshalom) had a cover file that was NOT in their images[] list; it is
--     inserted as their lead image (sort_order 0, is_cover=true), so those two
--     galleries gain the cover shot as image #1. Total image rows: 75 (73 + 2).
--
-- IDEMPOTENT: projects use ON CONFLICT (slug) DO NOTHING; images use
-- INSERT … WHERE NOT EXISTS (project_slug,url). Safe to re-run; a row that was
-- later soft-deleted in the admin is NOT resurrected.
-- ============================================================

-- gallery_projects rows
INSERT INTO gallery_projects (slug, url_slug, title_he, title_en, category_he, category_en, description_he, description_en, categories, aspect, sort_order, is_published) VALUES ('amshinov', 'amshinov-beis-medrash-jerusalem', 'קריית אמשינוב', 'Kiryat Amshinov', 'תשתיות ציבוריות', 'Public Infrastructure', 'ביצוע מדויק באזור עירוני עמוס, עם פתרונות הרמה ותכנון לוגיסטי מורכב.', 'Precision execution in high-traffic urban zones, with complex crane logistics and access management.', ARRAY['infrastructure']::text[], '4/3', 0, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO gallery_projects (slug, url_slug, title_he, title_en, category_he, category_en, description_he, description_en, categories, aspect, sort_order, is_published) VALUES ('bayit-vegan', 'bayit-vegan-luxury-apartment', 'בית וגן ירושלים', 'Bayit Vegan JLM', 'שיפוץ מבני', 'Structural Renovation', 'החלפת תשתיות מלאה ותוספת מבנית בבניין קיים — עם שמירה על רצף הפעילות.', 'Complete infrastructure replacement and structural expansion in an existing residential building.', ARRAY['renovations']::text[], '3/4', 1, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO gallery_projects (slug, url_slug, title_he, title_en, category_he, category_en, description_he, description_en, categories, aspect, sort_order, is_published) VALUES ('ohel-avshalom', 'ohel-avshalom-synagogue-jerusalem', 'מוסדות אוהל אבשלום', 'Ohel Avshalom Institutions', 'מוסדות ציבור', 'Public Institutions', 'הרחבות ותוספות בבניין ציבורי פעיל — עם ניהול שלבי קפדני ואפס הפרעה לפעילות.', 'Expansions and additions within an active public building, with strict phased management.', ARRAY['renovations','infrastructure']::text[], '4/3', 2, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO gallery_projects (slug, url_slug, title_he, title_en, category_he, category_en, description_he, description_en, categories, aspect, sort_order, is_published) VALUES ('ramat-eshkol', 'ramat-eshkol-penthouse', 'פנטהאוס רמת אשכול', 'Ramat Eshkol Penthouse', 'עבודות גמר פרימיום', 'Premium Finish Work', 'לוגיסטיקה מורכבת בקומה גבוהה עם חידוש תשתיות מתקדמות ועיצוב פנים יוקרתי.', 'High-floor logistics with advanced infrastructure renewal and luxury interior detailing.', ARRAY['finish']::text[], '3/4', 3, true) ON CONFLICT (slug) DO NOTHING;
INSERT INTO gallery_projects (slug, url_slug, title_he, title_en, category_he, category_en, description_he, description_en, categories, aspect, sort_order, is_published) VALUES ('jerusalem-luxury', 'jerusalem-luxury-residence', 'דירת יוקרה ירושלים', 'Jerusalem Luxury Apartment', 'שיפוץ יוקרה', 'Luxury Renovation', 'שיפוץ מוחלט של דירה יוקרתית בירושלים — עם חיפויי אבן ירושלמית ועבודות גמר פרימיום.', 'Full gut renovation of a high-end Jerusalem apartment with Jerusalem stone cladding and premium finishes.', ARRAY['finish','renovations']::text[], '16/9', 4, true) ON CONFLICT (slug) DO NOTHING;

-- gallery_images rows (url = current /public path; cover marked is_cover)
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-1.jpg', 0, true
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-1.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-01.jpg', 1, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-01.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-2.jpg', 2, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-2.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-3.jpg', 3, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-3.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-4.jpg', 4, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-4.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-5.jpg', 5, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-5.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-6.jpg', 6, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-6.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-7.jpg', 7, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-7.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-8.jpg', 8, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-8.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-9.jpg', 9, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-9.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-10.jpg', 10, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-10.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-11.jpg', 11, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-11.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-12.jpg', 12, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-12.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-13.jpg', 13, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-13.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-14.jpg', 14, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-14.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-15.jpg', 15, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-15.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-16.jpg', 16, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-16.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-17.jpg', 17, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-17.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-18.jpg', 18, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-18.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-19.jpg', 19, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-19.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-20.jpg', 20, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-20.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-21.jpg', 21, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-21.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'amshinov', '/amshinov-22.jpg', 22, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'amshinov' AND url = '/amshinov-22.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan.jpg', 0, true
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-1.jpg', 1, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-1.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-2.jpg', 2, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-2.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-3.jpg', 3, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-3.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-4.jpg', 4, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-4.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-5.jpg', 5, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-5.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-6.jpg', 6, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-6.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-7.jpg', 7, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-7.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-8.jpg', 8, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-8.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-9.jpg', 9, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-9.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-10.jpg', 10, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-10.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-11.jpg', 11, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-11.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-12.jpg', 12, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-12.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-13.jpg', 13, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-13.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-14.jpg', 14, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-14.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-15.jpg', 15, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-15.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-16.jpg', 16, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-16.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-17.jpg', 17, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-17.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-18.jpg', 18, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-18.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'bayit-vegan', '/bayit-vegan-19.jpg', 19, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'bayit-vegan' AND url = '/bayit-vegan-19.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom.jpg', 0, true
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-1.jpg', 1, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-1.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-2.jpg', 2, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-2.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-3.jpg', 3, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-3.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-4.jpg', 4, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-4.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-5.jpg', 5, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-5.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-6.jpg', 6, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-6.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-7.jpg', 7, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-7.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-8.jpg', 8, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-8.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-9.jpg', 9, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-9.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-10.jpg', 10, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-10.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-11.jpg', 11, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-11.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-12.jpg', 12, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-12.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-13.jpg', 13, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-13.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-14.jpg', 14, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-14.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ohel-avshalom', '/ohel-avshalom-15.jpg', 15, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ohel-avshalom' AND url = '/ohel-avshalom-15.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ramat-eshkol', '/ramat-eshkol.jpg', 0, true
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ramat-eshkol' AND url = '/ramat-eshkol.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ramat-eshkol', '/ramat-eshkol-penthouse-1.jpg', 1, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ramat-eshkol' AND url = '/ramat-eshkol-penthouse-1.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ramat-eshkol', '/ramat-eshkol-penthouse-2.jpg', 2, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ramat-eshkol' AND url = '/ramat-eshkol-penthouse-2.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ramat-eshkol', '/ramat-eshkol-penthouse-3.jpg', 3, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ramat-eshkol' AND url = '/ramat-eshkol-penthouse-3.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ramat-eshkol', '/ramat-eshkol-penthouse-4.jpg', 4, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ramat-eshkol' AND url = '/ramat-eshkol-penthouse-4.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ramat-eshkol', '/ramat-eshkol-penthouse-5.jpg', 5, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ramat-eshkol' AND url = '/ramat-eshkol-penthouse-5.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ramat-eshkol', '/ramat-eshkol-penthouse-6.jpg', 6, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ramat-eshkol' AND url = '/ramat-eshkol-penthouse-6.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ramat-eshkol', '/ramat-eshkol-penthouse-7.jpg', 7, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ramat-eshkol' AND url = '/ramat-eshkol-penthouse-7.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ramat-eshkol', '/ramat-eshkol-penthouse-8.jpg', 8, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ramat-eshkol' AND url = '/ramat-eshkol-penthouse-8.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'ramat-eshkol', '/ramat-eshkol-penthouse-9.jpg', 9, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'ramat-eshkol' AND url = '/ramat-eshkol-penthouse-9.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'jerusalem-luxury', '/jerusalem-luxury-living-room.jpg', 0, true
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'jerusalem-luxury' AND url = '/jerusalem-luxury-living-room.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'jerusalem-luxury', '/jerusalem-black-sink-detail.jpg', 1, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'jerusalem-luxury' AND url = '/jerusalem-black-sink-detail.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'jerusalem-luxury', '/jerusalem-balcony-view.jpg', 2, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'jerusalem-luxury' AND url = '/jerusalem-balcony-view.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'jerusalem-luxury', '/jerusalem-stone-drilling-detail.jpg', 3, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'jerusalem-luxury' AND url = '/jerusalem-stone-drilling-detail.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'jerusalem-luxury', '/jerusalem-site-inspection-motti.jpg', 4, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'jerusalem-luxury' AND url = '/jerusalem-site-inspection-motti.jpg');
INSERT INTO gallery_images (project_slug, url, sort_order, is_cover)
SELECT 'jerusalem-luxury', '/jerusalem-crane-logistics.jpg', 5, false
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE project_slug = 'jerusalem-luxury' AND url = '/jerusalem-crane-logistics.jpg');

-- projects: 5 · image rows: 75 (incl. 2 cover-only files added as lead image)
