# Dead Code Map
**Generated:** 2026-05-03  
**Method:** Static analysis — grep-based reference counting. No runtime tracing.

---

## Summary

| Type | Count | Notes |
|------|-------|-------|
| Unused components | 3 | Never imported anywhere |
| Orphaned API routes | 1 | `/api/gallery` — only consumer is unused component |
| Special-purpose route (not dead) | 1 | `/api/seed` — one-time manual endpoint |
| Pages with zero internal links | 6 | Mix of orphaned + intentional |
| Landing pages (correctly unlinked) | 3 | Direct-traffic only |
| Large modules (>500 LOC) | 5 | Candidates for review/extraction |

---

## Table 1 — API Routes Without UI Consumers

All API routes have at least one UI file referencing them, with two exceptions:

| Route | References | Assessment |
|-------|-----------|------------|
| `/api/seed` | 0 | **Intentionally dead** — one-time admin seed endpoint, called manually. No UI needed. Safe to keep as-is. |
| `/api/gallery` | 1 (only `PortfolioPhotoGallery.tsx`) | **Functionally dead** — its sole consumer (`PortfolioPhotoGallery`) is itself unused (see Table 2). The route fetches from `/public/portfolio/` which was a legacy approach superseded by Cloudinary via `/api/cloudinary-gallery`. |

**All other routes** (44) have active UI consumers. Notable single-reference routes that appear "thin" but are legitimately used:
- `/api/admin/backup` → `content-editor/page.tsx`
- `/api/admin/maintenance` → `admin/health/page.tsx`
- `/api/revalidate` → `content-editor/page.tsx`
- `/api/upload` → `ChangeOrderForm.tsx`

---

## Table 2 — Unused Components

Components with zero import statements anywhere in the codebase (excluding the component file itself):

| File | LOC (approx) | Last Known Purpose | Assessment |
|------|--------------|--------------------|------------|
| `AdminDashboard.tsx` | ~50 | Unknown — no consumer found | **Dead.** Never imported anywhere. Likely superseded by `AdminPortal.tsx`. |
| `BeforeAfterSlider.tsx` | ~80 | Before/after image reveal slider | **Dead.** Never imported. Possibly a prototype for `XRaySlider.tsx` (which IS used). |
| `PortfolioPhotoGallery.tsx` | ~120 | Legacy portfolio grid using `/api/gallery` | **Dead.** Superseded by `ProjectsGallery.tsx` which uses Cloudinary. Also takes down `/api/gallery` with it. |

**Components that appeared unused but are actually used:**
- `ForemanPortal` → imported inside `AdminPortal.tsx`
- `FounderQuote`, `ProcessSection`, `TechnicalAnatomy` → imported in `ClientLayouts/EnHomeClient.tsx` + `HeHomeClient.tsx`
- `ProjectsGallery` → imported in `ClientLayouts/EnProjectsClient.tsx` + `HeProjectsClient.tsx`
- `SuccessFlash` → imported in `AttendanceForm.tsx` + `AdminPortal.tsx`
- `WeeklyPlanner` → imported inside `AdminPortal.tsx`

---

## Table 3 — Pages With No Internal Links

| Page | Link Count | Assessment |
|------|-----------|------------|
| `/he/purim` | 0 | **Orphaned** — seasonal page with no entry point from any menu or page |
| `/he/voucher` | 0 | **Orphaned** — voucher generator, no link from any nav or page |
| `/en/preview` | 0 | **Orphaned** — likely a dev/staging preview route; no public entry point |
| `/he/preview` | 0 | **Orphaned** — same as above |
| `/internal/banner` | 0 | **Intentionally unlinked** — print-only banner page, accessed directly |
| `/internal/prime-steel` | 0 | **Intentionally unlinked** — mirrors the binyan-eitan internal dashboard but for Prime Steel company; no nav link because it's accessed directly |
| `/lp/givat-zeev` | 0 | **Correct** — landing page, direct-traffic only |
| `/lp/jerusalem` | 0 | **Correct** — landing page, direct-traffic only |
| `/lp/overseas` | 0 | **Correct** — landing page, direct-traffic only |
| `/maintenance` | 2 | ✅ Linked (from middleware or internal pages) |

> **Open Question for Chanan:** Are `/en/preview` and `/he/preview` still in use? If not, they could be removed. Same question for `/he/purim` — is it seasonal (keep, just unlinked) or fully discontinued?

---

## Table 4 — Large Module Sizes

| Module | Files | LOC | Associated API Routes | Notes |
|--------|-------|-----|-----------------------|-------|
| `math-app` | 34 | 5,240 | none (self-contained) | Largest module. 8 engines, 6 pages, own hook system. Fully isolated. |
| `admin/cockpit` | 1 | 1,648 | `/api/holding/*` (3 routes) | Single 1,648-line God component — prime refactor candidate |
| `internal/content-editor` | 1 | 1,628 | `/api/admin/backup`, `/api/revalidate` | Another single-file God component |
| `components/AdminPortal` | 1 | 2,125 | `/api/admin/income`, `/api/admin/whoami`, `/api/foreman-auth`, `/api/admin/tasks`, `/api/admin/staff`, `/api/admin/projects`, `/api/admin/materials`, `/api/admin/daily-reports`, `/api/admin-auth` | Largest single component. 9 API routes. Owns ForemanPortal + WeeklyPlanner. |
| `components/AttendanceAdminPanel` | 1 | 1,082 | consumed by `AdminPortal` | ~1,100 LOC sub-component |
| `he/purim` | 2 | 697 | none | Seasonal, orphaned |

---

## Recommendations (Easy Win → Complex Decision)

### Easy Wins (safe to delete, no dependencies)
1. **Delete `AdminDashboard.tsx`** — zero references, clearly superseded
2. **Delete `BeforeAfterSlider.tsx`** — zero references, `XRaySlider.tsx` covers the use case
3. **Delete `PortfolioPhotoGallery.tsx`** — zero references, superseded by `ProjectsGallery.tsx`
4. **Delete `/api/gallery/route.ts`** — only consumed by the above unused component
5. **Delete `/en/preview` and `/he/preview`** — if confirmed unused (see Open Question)

### Medium Effort
6. **Split `AdminPortal.tsx` (2,125 LOC)** into sub-components (e.g., separate ForemanPortal section, Income section, Weekly Planner section)
7. **Split `admin/cockpit/page.tsx` (1,648 LOC)** — holding company dashboard; could extract task list, company selector, upload panel
8. **Split `internal/content-editor/page.tsx` (1,628 LOC)** — extract form sections into sub-components

### Complex Decisions (requires Chanan input)
9. **`/he/purim`** — keep as seasonal (just unlinked), or archive?
10. **`/he/voucher`** — is this actively used by staff? It's unlinked but may be accessed directly
11. **`math-app` (5,240 LOC, 34 files)** — is this part of this project intentionally or should it be a separate repo?
12. **`/internal/prime-steel`** — a second company in the same codebase; architectural decision on whether to keep co-located

---

## Open Questions

1. **`/en/preview` + `/he/preview`** — Still used? If not, safe to delete.
2. **`/he/purim`** — Seasonal-keep or discontinued?
3. **`/he/voucher`** — Accessed directly by staff, or orphaned?
4. **`math-app`** — Intentionally co-located with the construction site? Or candidate for extraction to its own repo?
5. **`AdminDashboard.tsx`** — Was this a prototype for the current `AdminPortal.tsx`? Safe to confirm deletion?
