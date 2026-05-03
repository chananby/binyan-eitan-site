# Projects Infrastructure — Build Log
_Generated: 2026-05-03_

---

## 1. Files Created

### Data Layer
| File | Description |
|------|-------------|
| `src/data/projects/types.ts` | `ProjectData` + `ProjectLang` + `ProjectMetadata` interfaces |
| `src/data/projects/amshinov.ts` | Project 01 — Amshinov Complex |
| `src/data/projects/bayit-vegan.ts` | Project 02 — Bayit Vegan Jerusalem |
| `src/data/projects/ohel-avshalom.ts` | Project 03 — Ohel Avshalom Institutions |
| `src/data/projects/ramat-eshkol.ts` | Project 04 — Ramat Eshkol Penthouse |
| `src/data/projects/jerusalem-luxury.ts` | Project 05 — Jerusalem Luxury Apartment |
| `src/data/projects/index.ts` | Barrel: `ALL_PROJECTS`, `PROJECT_SLUGS`, `getProjectBySlug()` |

### Components
| File | Description |
|------|-------------|
| `src/app/components/ProjectGalleryClient.tsx` | "use client" — thumbnail grid + lightbox for project detail pages |

### Routes — EN
| File | Description |
|------|-------------|
| `src/app/en/projects/[slug]/page.tsx` | SSG detail page for all 5 EN projects |

### Routes — HE
| File | Description |
|------|-------------|
| `src/app/he/projects/[slug]/page.tsx` | SSG detail page for all 5 HE projects |

---

## 2. Files Modified

| File | What Changed |
|------|-------------|
| `src/app/en/projects/page.tsx` | Removed `dynamic(..., { ssr: false })` → direct SSR import of `ProjectsGallery`; added `CollectionPage` JSON-LD schema |
| `src/app/he/projects/page.tsx` | Same as above, Hebrew metadata |
| `src/app/components/ProjectsGallery.tsx` | Added "Project Page" link button on each card's hover overlay (next to existing "View Gallery" button); `e.stopPropagation()` prevents lightbox from opening on link click |
| `src/app/sitemap.ts` | Added `/en/projects`, `/he/projects` (priority 0.9) and all 10 project detail URLs (priority 0.8) with hreflang alternates |

---

## 3. Build Results

```
✓ Compiled successfully
✓ Generating static pages (113/113)
0 TypeScript errors (tsc --noEmit)
```

### New project pages in build output

```
● /en/projects/[slug]  — 2.4 kB  (SSG)
  ├ /en/projects/amshinov
  ├ /en/projects/bayit-vegan
  ├ /en/projects/ohel-avshalom
  ├ /en/projects/ramat-eshkol
  └ /en/projects/jerusalem-luxury

● /he/projects/[slug]  — 2.4 kB  (SSG)
  ├ /he/projects/amshinov
  ├ /he/projects/bayit-vegan
  ├ /he/projects/ohel-avshalom
  ├ /he/projects/ramat-eshkol
  └ /he/projects/jerusalem-luxury

ƒ /en/projects  — SSR (upgraded from ssr:false client-only)
ƒ /he/projects  — SSR (upgraded from ssr:false client-only)
```

**Total new pages: 10 (5 EN + 5 HE)**

### Pre-existing build warning (not introduced by this change)
```
FATAL: /api/admin/attendance/report — Dynamic server usage (request.cookies)
```
This is a pre-existing issue in the admin API routes, unrelated to this task.

---

## 4. Rendering Strategy Decisions

| Route | Mode | Rationale |
|-------|------|-----------|
| `/en/projects/[slug]` | `●` SSG | Content is static (comes from `src/data/`). Fast, cacheable, ideal for SEO. Regenerates on deploy. |
| `/he/projects/[slug]` | `●` SSG | Same. |
| `/en/projects` | `ƒ` SSR | Client component (`ProjectsGallery`) with Cloudinary live fetch; renders initial HTML server-side. Upgrade from `{ ssr: false }`. |
| `/he/projects` | `ƒ` SSR | Same. |

---

## 5. OPEN_QUESTIONS

### OQ-1: ClientLayouts orphaned files
`src/app/components/ClientLayouts/EnProjectsClient.tsx` and `HeProjectsClient.tsx` are now dead code — they were the `{ ssr: false }` wrappers that the old `page.tsx` files imported. No other file references them.
**Decision taken:** Left in place to avoid accidental breakage. Safe to delete.
**Recommendation:** Delete both files after confirming no other references appear.

### OQ-2: JSON-LD schema type for project pages
I used `@type: "CreativeWork"` for individual project pages. Alternatives considered:
- `ConstructionProject` — not a standard Schema.org type
- `Article` — closest to a case-study format
- `CreativeWork` — flexible parent type, accepted by Google Rich Results
**Decision taken:** `CreativeWork` — most flexible, avoids misclassification.
**Recommendation:** Could upgrade to `Article` if the copy is editorial in nature, or add `ItemListElement` on the index page.

### OQ-3: `dateCompleted` placeholder values
All 5 project data files have `dateCompleted: "[DATE - e.g. 2023-09]"`. The meta strip on the page has a guard: `!project.dateCompleted.startsWith("[")` so it hides the field until real data is added.
**Recommendation:** Fill in real dates before launch.

### OQ-4: `projectSize` field
All projects currently have `projectSize: undefined`. The meta strip hides it when undefined.
**Recommendation:** Add real sqm values if available.

### OQ-5: `keyFeatures` — placeholder guard
The "Key Features" section on the project detail page has a guard:
`{en.keyFeatures.some((f) => !f.startsWith("[")) && (...)}`
This hides the entire section until at least one real feature is provided.
**Recommendation:** Fill in key features before launch.

---

## 6. NEXT STEPS — What remains before launch

### Content (must do)
- [ ] Fill in real `introParagraph` (~80 words) for all 5 projects × 2 languages
- [ ] Fill in real `challengeAndSolution` (~150 words) for all 5 projects × 2 languages
- [ ] Fill in real `resultParagraph` (~70 words) for all 5 projects × 2 languages
- [ ] Fill in real `keyFeatures` (4 items) for all 5 projects × 2 languages
- [ ] Fill in real `dateCompleted` for all 5 projects
- [ ] Fill in real `projectSize` where applicable
- [ ] Fill in real `location` for amshinov (currently `"[מיקום — שכונה, ירושלים]"`)
- [ ] Fill in real SEO `metadata.titleHE`, `titleEN`, `descriptionHE`, `descriptionEN` for all 5 projects

### SEO metadata (must do before indexing)
All 10 metadata fields are currently placeholders. Until filled in:
- `generateMetadata` returns placeholder titles/descriptions
- OpenGraph cards will show placeholder text
- JSON-LD keywords will be placeholder text

### Images
- [ ] Verify all `galleryImages` paths resolve in production Cloudinary
- [ ] Consider adding hero image with `c_fill,ar_16:9` transform for better mobile hero rendering
- [ ] OG image for each project (currently uses `heroImage` directly)

### Cleanup
- [ ] Delete `src/app/components/ClientLayouts/EnProjectsClient.tsx` (orphaned)
- [ ] Delete `src/app/components/ClientLayouts/HeProjectsClient.tsx` (orphaned)

### Navigation
- [ ] Consider adding `/projects` link to Navbar (currently hidden — only accessible from home page `#portfolio` anchor)
- [ ] Consider adding project detail links in the home page `PortfolioGallery` component as well

---

_Note: This file is temporary. After review, move to `../binyan-eitan-internal-docs/` and remove from repo._
