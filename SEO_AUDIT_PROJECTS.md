# SEO Audit — Projects Pages
**Generated:** 2026-05-03  
**Reference:** Same 8 parameters as `SEO_AUDIT.md` (expertise articles audit)  
**Scope:** `/en/projects` + `/he/projects` (index) + 5 projects in gallery

---

## Architecture Note — No Individual Project Pages

**The 5 projects (Amshinov, Bayit Vegan, Ohel Avshalom, Ramat Eshkol, Jerusalem Luxury) do not have dedicated URLs.**  
They exist only as entries in the `ProjectsGallery` component, opened via a lightbox (modal) on the index page.

- URL when viewing a project: `/en/projects` (unchanged)
- No `<link rel="canonical">` per project
- No `<title>` or `<meta description>` per project
- No JSON-LD per project
- Projects are indexed (if at all) only through the gallery images on the index page

This is the most significant architectural finding of this audit. All SEO score columns for "individual project pages" are N/A — the pages do not exist.

---

## Summary Table

| Parameter | /en/projects | /he/projects | Individual Projects |
|-----------|:------------:|:------------:|:-------------------:|
| 1. Meta Title (50–60c) | ❌ 72c | ✅ 56c | N/A (no pages) |
| 2. Meta Description (140–160c) | ❌ 183c | ❌ 132c | N/A |
| 3. H1 | ✅ "Our Projects" | ✅ "הפרויקטים שלנו" | N/A |
| 4. Structured Data (JSON-LD) | ❌ None | ❌ None | ❌ None |
| 5. OG Image | ⚠️ 1200×800 (not 1200×630) | ⚠️ 1200×800 | N/A |
| 6. Internal Links | ✅ Navbar + Footer | ✅ Navbar + Footer | ❌ No dedicated URLs |
| 7. Alt Text | ⚠️ Partial | ⚠️ Partial | N/A |
| 8. Hreflang | ⚠️ Incomplete | ⚠️ Incomplete | N/A |

**Score:** ✅ 4 · ⚠️ 6 · ❌ 6

---

## Critical Issues (❌)

### 1. Meta Title — EN Too Long (72c)
**Page:** `/en/projects`  
**Current title field:** `"Our Projects | Selected Portfolio of Premium Construction"` (57c)  
**After layout template `%s | Binyan Eitan` is applied:** `"Our Projects | Selected Portfolio of Premium Construction | Binyan Eitan"` (72c)  
**Target:** ≤60c  

The title already contains a subtitle after the pipe. With the layout suffix, it exceeds the limit by 12 characters. Search engines will truncate at ~60c, cutting off "Premium Construction".

**Fix option A:** Use `{ title: { absolute: "Our Projects | Binyan Eitan" } }` (34c — very short, clean)  
**Fix option B:** Use `{ title: { absolute: "Binyan Eitan — Construction Portfolio" } }` (39c)  
**Fix option C:** Shorten to `"Our Projects — Premium Construction"` + let template add suffix = 52c total ✅

### 2. Meta Description — Both Pages Out of Range
| Page | Current | Length | Target |
|------|---------|--------|--------|
| EN | "From institutional complexes to private luxury villas — every project built to engineering exactitude. Structural transparency, premium dark materials, precision you can walk through." | 183c | 140–160c |
| HE | "ממתחמים ציבוריים ועד וילות פרטיות יוקרתיות — כל פרויקט בנוי לרמת דיוק הנדסי. שקיפות מבנית, חומר שחור פרימיום, דיוק שאפשר לעבור דרכו." | 132c | 140–160c |

EN is 23c too long. HE is 8c too short.

### 3. No JSON-LD Structured Data — Index Pages
Neither `/en/projects` nor `/he/projects` has any `<script type="application/ld+json">`.  
Recommended schema for a portfolio/gallery page: `ItemList` with `ListItem` entries pointing to (ideally) individual project URLs.  
Without dedicated project pages, the best available option is a single `CollectionPage` or `ImageGallery` schema on the index.

### 4. No Individual Project Pages (Largest SEO Gap)
Each project (Amshinov, Bayit Vegan, Ohel Avshalom, Ramat Eshkol, Jerusalem Luxury) represents a significant piece of work with rich content (20–25 images, title, category, description) — but none is indexable as a standalone URL.

**Impact:**  
- Google cannot rank "Amshinov Complex construction Jerusalem" as a standalone result
- Backlinks to a specific project all point to the generic `/projects` URL
- The lightbox content (images, descriptions) is rendered client-side and not crawled
- Internal linking from expertise articles to relevant projects is impossible

---

## Improvements Recommended (⚠️)

### 5. Hreflang — Missing Self-Reference and x-default
**Current EN alternates:**
```ts
languages: { he: "https://binyaneitan.com/he/projects" }
```
**Current HE alternates:**
```ts
languages: { en: "https://binyaneitan.com/en/projects" }
```

Both are missing:
- Self-referencing tag (`"en": "..."` in EN page)
- `"x-default"` tag

**Fix:** Follow the same pattern as the expertise articles:
```ts
languages: {
  "en": "https://binyaneitan.com/en/projects",
  "he": "https://binyaneitan.com/he/projects",
  "x-default": "https://binyaneitan.com/en/projects",
}
```

### 6. OG Image Dimensions — 1200×800 Instead of 1200×630
Both pages use `width: 1200, height: 800` for the OG image (amshinov-1.jpg).  
Facebook, LinkedIn, WhatsApp all crop to 1.91:1 ratio (1200×630). The current 1200×800 image will be letterboxed or cropped unpredictably.

**Fix:** Set `height: 630` in the OG image metadata (the image will be cropped by platforms anyway; declaring 630 sets correct expectations).

### 7. Alt Text — Lightbox Thumbnails Are Generic
**Current thumbnail alt:** `"${project.title} — ${i + 1}"` (e.g. "Amshinov Complex — 3")  
**Cover image alt:** `"${project.en.title} | Binyan Eitan"` ✅ (acceptable)  
**Lightbox main image alt:** `"${project.en.title} — image ${activeImage + 1}"` ⚠️ (descriptive enough for the main image but could be richer)

Thumbnails are indexed by Google Images but have no descriptive alt text. For a construction portfolio, this is a missed opportunity.

---

## Doing Well (✅)

- **H1 tags present and appropriate** — "Our Projects" (EN) / "הפרויקטים שלנו" (HE). Clear, keyword-relevant.
- **Canonical URLs set** — both pages have explicit canonical pointing to themselves.
- **Internal linking from Navbar** — both `/en/projects` and `/he/projects` are in the main nav.
- **HE title length** — 42c raw + 14c suffix = 56c ✅ within target range.
- **`robots: { index: true, follow: true }`** — explicitly set on both pages.
- **OG image uses a real project photo** — `amshinov-1.jpg` is a genuine project image, not a generic placeholder.
- **Project descriptions in `projects.ts`** — `shortDesc` fields exist in both HE and EN for all 5 projects; this content is available for use if individual pages are created.

---

## Top 5 Recommended Fixes

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| 1 | **Create individual project pages** `/en/projects/[slug]` + `/he/projects/[slug]` | High (2–3 days) | 🔴 Very High — enables indexing of 5 valuable portfolio pages |
| 2 | **Fix EN meta title** (72c → ≤60c) | Low (5 min) | 🟡 Medium — prevents SERP truncation |
| 3 | **Fix hreflang on both pages** (add self-ref + x-default) | Low (10 min) | 🟡 Medium — correct bilingual signal to Google |
| 4 | **Shorten EN description** (183c → 140–160c) + **lengthen HE** (132c → 140–160c) | Low (15 min) | 🟡 Medium — better SERP snippet control |
| 5 | **Add JSON-LD `CollectionPage` schema** to index pages | Medium (1 hour) | 🟡 Medium — structured data signal for portfolio page |

---

## Notes & Observations

1. **`ProjectsGallery` is a client component** (`"use client"`) that fetches live data from Cloudinary on mount. Google can index dynamically-loaded content but it requires a second crawl pass. The static fallback in `GALLERY_PROJECTS` (from `src/lib/projects.ts`) provides a baseline — but since the component hydrates on client, the initial SSR response may not contain the full gallery.

2. **`/en/projects` and `/he/projects` both use `dynamic(() => import(...), { ssr: false })`** for the full client component. This means the server sends an empty shell and the gallery renders entirely on the client. **This is a significant crawlability concern** — Google may not execute the JavaScript on every crawl. The portfolio content (project titles, descriptions, images) may not be indexed at all.

3. **`keywords` metadata is set on both pages** (e.g., "Construction Projects Israel", "Luxury Architecture"). Google has officially ignored `<meta name="keywords">` since 2009. These have zero SEO value but no harm. Could be cleaned up.

4. **The `[slug]` dynamic routes** (`/en/expertise/[slug]`, `/he/expertise/[slug]`) exist for expertise articles. The same pattern could be applied to projects with minimal architectural effort, reusing the existing `projects.ts` data as the source.

5. **Recommendation to discuss with Chanan:** Creating individual project pages would be the single highest-impact SEO improvement available on the entire site. The data already exists (`src/lib/projects.ts`), the images are in Cloudinary, and the slug IDs are defined (`amshinov`, `bayit-vegan`, `ohel-avshalom`, `ramat-eshkol`, `jerusalem-luxury`). The main work is building the page template and metadata generation.
