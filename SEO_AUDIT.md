# SEO Audit Report — Expertise Articles
*Generated: 2026-05-03*
*Auditor: Claude (automated static analysis — no live crawl)*

---

## Methodology Notes

- Titles are evaluated **including the layout template suffix**: EN adds ` | Binyan Eitan` (+15 chars), HE adds ` | בניין איתן` (+14 chars).
- Description lengths are raw character counts (Google truncates at ~160 chars in SERPs). Note: Hebrew characters render wider in pixels — 100 Hebrew chars ≈ 130 Latin chars visually; short HE descriptions are penalised accordingly.
- Hreflang analysis is based on `alternates.languages` in Next.js metadata (which generates `<link rel="alternate" hreflang="...">` tags).
- Internal links count only links inside the article body/sidebar that point to other site pages (not external CTA links).
- JSON-LD schema refers to per-page Article/BlogPosting schema — not the site-wide LocalBusiness schema in `/en/layout.tsx` and `/he/layout.tsx`.

---

## Summary Table

| Article | Lang | Title (with template) | Desc | H1 | Schema | OG Image | Links | Alt | Hreflang |
|---------|------|----------------------|------|----|--------|----------|-------|-----|----------|
| after-handover | EN | ⚠️ 68c | ⚠️ 161c | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ |
| after-handover | HE | ❌ 41c | ❌ 109c | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ |
| behind-the-walls | EN | ⚠️ 69c | ✅ 151c | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ |
| behind-the-walls | HE | ⚠️ 48c | ❌ 105c | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ |
| building-from-abroad | EN | ✅ 57c | ⚠️ 169c | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ |
| building-from-abroad | HE | ⚠️ 45c | ⚠️ 116c | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ |
| avoid-mistakes | EN | ⚠️ 47c | ⚠️ 119c | ✅ | ❌ | ✅ | ⚠️ | ✅ | ✅ |
| avoid-mistakes | HE | ❌ 39c | ⚠️ 120c | ✅ | ❌ | ✅ | ⚠️ | ✅ | ✅ |
| reading-quote | EN | ⚠️ 65c | ❌ 177c | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ |
| reading-quote | HE | ⚠️ 47c | ⚠️ 126c | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ |

**Score tally:** ✅ 22 · ⚠️ 42 · ❌ 16 (out of 80 checks)

---

## Per-Article Detail

### 1. after-handover

#### EN `/en/expertise/after-handover`

| Parameter | Value | Status |
|-----------|-------|--------|
| Title (raw) | "The Handover: Your Roadmap to Long-Term Peace of Mind" (53c) | |
| Title (with template) | "The Handover: Your Roadmap to Long-Term Peace of Mind \| Binyan Eitan" (68c) | ⚠️ 8 chars over limit — Google will truncate |
| Description | "What happens the day after your renovation? Binyan Eitan's guide to a proper handover, As-Made infrastructure documentation, and lasting personal accountability." (161c) | ⚠️ 1 char over |
| H1 | Pulled dynamically from DB (`title_en`) — one H1 per page | ✅ |
| JSON-LD Article Schema | None | ❌ |
| OG Image | `/luxury-apartment-renovation-view.jpg` 1200×800 — file exists, metadataBase set | ⚠️ Ratio 3:2 not 1.91:1 |
| Internal Links | 2 fixed (back to /expertise, sidebar #contact) + dynamic related articles | ⚠️ |
| Alt Text | Hero alt = article title (dynamic) | ✅ |
| Hreflang | `alternates` has only `canonical`, no `languages` | ❌ |

#### HE `/he/expertise/after-handover`

| Parameter | Value | Status |
|-----------|-------|--------|
| Title (raw) | "יום המסירה והאחריות על הבית" (27c) | |
| Title (with template) | "יום המסירה והאחריות על הבית \| בניין איתן" (41c) | ❌ 9 chars below minimum — too short for Google |
| Description | "מה קורה ביום שאחרי השיפוץ? המדריך של בניין איתן למסירה נכונה, תיעוד תשתיות (As-Made) ואחריות אישית לאורך זמן." (109c) | ❌ 31 chars short — Google may auto-generate |
| H1 | Dynamic from DB (`title_he`) — one H1 | ✅ |
| JSON-LD Article Schema | None | ❌ |
| OG Image | Same image as EN — 1200×800 | ⚠️ Ratio |
| Internal Links | Same 2 fixed links | ⚠️ |
| Alt Text | `"סלון מושלם ביום מסירת הפרויקט — בניין איתן"` — descriptive | ✅ |
| Hreflang | No `languages` cross-link | ❌ |

---

### 2. behind-the-walls

#### EN `/en/expertise/behind-the-walls`

| Parameter | Value | Status |
|-----------|-------|--------|
| Title (with template) | "Behind the Walls: The Invisible Standard of Excellence \| Binyan Eitan" (69c) | ⚠️ 9 chars over |
| Description | "Why is infrastructure the most important part of a renovation? Binyan Eitan's guide to plumbing, electrical, and waterproofing at the highest standard." (151c) | ✅ |
| H1 | Dynamic from DB | ✅ |
| JSON-LD Article Schema | None | ❌ |
| OG Image | `/interior-wall-framing-systems.jpg` 1200×800 — relevant image ✅ but ratio ⚠️ | ⚠️ |
| Internal Links | 2 fixed | ⚠️ |
| Alt Text | `"Construction infrastructure phase — pipes and framing — Binyan Eitan"` | ✅ |
| Hreflang | No cross-link | ❌ |

#### HE `/he/expertise/behind-the-walls`

| Parameter | Value | Status |
|-----------|-------|--------|
| Title (with template) | "מאחורי הקירות: איכות הבנייה הנסתרת \| בניין איתן" (48c) | ⚠️ 2 chars short |
| Description | "למה התשתיות בבית הן החלק הכי חשוב בשיפוץ? המדריך של בניין איתן לאינסטלציה, חשמל ואיטום ברמה הגבוהה ביותר." (105c) | ❌ 35 chars short |
| H1 | Dynamic from DB | ✅ |
| JSON-LD Article Schema | None | ❌ |
| OG Image | Same as EN — relevant | ⚠️ Ratio |
| Internal Links | 2 fixed | ⚠️ |
| Alt Text | `"שלב תשתיות בנייה — צנרת ומסגרת — בניין איתן"` | ✅ |
| Hreflang | No cross-link | ❌ |

---

### 3. building-from-abroad

#### EN `/en/expertise/building-from-abroad`

| Parameter | Value | Status |
|-----------|-------|--------|
| Title (with template) | "Building Your Israeli Property From Abroad \| Binyan Eitan" (57c) | ✅ |
| Description | "The complete guide to building and renovating in Israel for overseas residents. Full transparency, regular updates, and expert remote project management **with Moti Eitan**." (169c) | ⚠️ Over + contains "Moti Eitan" — should be "Chanan" |
| H1 | Dynamic from DB | ✅ |
| JSON-LD Article Schema | None | ❌ |
| OG Image | `/luxury-interior.jpg` 1200×800 | ⚠️ Generic image — not specific to "building from abroad" topic |
| Internal Links | 2 fixed | ⚠️ |
| Alt Text | `"Remote property management in Israel — Binyan Eitan"` | ✅ |
| Hreflang | No cross-link | ❌ |

#### HE `/he/expertise/building-from-abroad`

| Parameter | Value | Status |
|-----------|-------|--------|
| Title (with template) | "ניהול פרויקט בנייה בישראל מרחוק \| בניין איתן" (45c) | ⚠️ 5 chars short |
| Description | "המדריך המלא לבנייה ושיפוץ בישראל עבור תושבי חוץ. שקיפות מלאה, דיווחים שוטפים וניהול מקצועי בשלט רחוק — **עם מוטי איתן**." (116c) | ⚠️ Short + contains "מוטי איתן" — should be "חנן" |
| H1 | Dynamic from DB | ✅ |
| JSON-LD Article Schema | None | ❌ |
| OG Image | Same as EN | ⚠️ |
| Internal Links | 2 fixed | ⚠️ |
| Alt Text | `"ניהול פרויקט בנייה בישראל מרחוק — בניין איתן"` | ✅ |
| Hreflang | No cross-link | ❌ |

---

### 4. how-to-avoid-renovation-mistakes ⭐ (best-configured article)

#### EN `/en/expertise/how-to-avoid-renovation-mistakes`

| Parameter | Value | Status |
|-----------|-------|--------|
| Title (with template) | "How to Avoid Renovation Mistakes \| Binyan Eitan" (47c) | ⚠️ 3 chars short — could add "Jerusalem" or a qualifier |
| Description | "A practical guide to preventing common home renovation errors, managing your budget, and ensuring sound infrastructure." (119c) | ⚠️ 21 chars short — lacks specificity and CTA pull |
| H1 | Dynamic from DB | ✅ |
| JSON-LD Article Schema | None | ❌ |
| OG Image | `/luxury-interior-finish-transformation.jpg` 1600×900 (closest to recommended ratio) | ✅ |
| Internal Links | 2 fixed | ⚠️ |
| Alt Text | `"Luxury renovation in Jerusalem — Binyan Eitan contractor"` | ✅ |
| Hreflang | `alternates.languages: { he: "..." }` — cross-link present | ✅ |

#### HE `/he/expertise/how-to-avoid-renovation-mistakes`

| Parameter | Value | Status |
|-----------|-------|--------|
| Title (with template) | "איך להימנע מטעויות בשיפוץ \| בניין איתן" (39c) | ❌ 11 chars short — very short, weak keyword signal |
| Description | "מדריך פרקטי למניעת טעויות נפוצות בשיפוץ הבית — שמירה על התקציב, ניהול תשתיות נכון ועבודה עברית מקצועית בירושלים ובנימין." (120c) | ⚠️ 20 chars short — though has good keywords |
| H1 | Dynamic from DB | ✅ |
| JSON-LD Article Schema | None | ❌ |
| OG Image | Same — 1600×900 | ✅ |
| Internal Links | 2 fixed | ⚠️ |
| Alt Text | `"שיפוץ יוקרה בירושלים — בניין איתן קבלן שיפוצים ובנייה"` | ✅ |
| Hreflang | `alternates.languages: { en: "..." }` — cross-link present | ✅ |

---

### 5. reading-a-professional-quote

#### EN `/en/expertise/reading-a-professional-quote`

| Parameter | Value | Status |
|-----------|-------|--------|
| Title (with template) | "Beyond the Price: How to Read a Construction Quote \| Binyan Eitan" (65c) | ⚠️ 5 chars over |
| Description | "The complete guide to reading a professional construction quote. How to spot 'gaps' in cheap proposals, why detail is your best protection, and what must appear in any contract." (177c) | ❌ 17 chars over — will definitely truncate |
| H1 | Dynamic from DB | ✅ |
| JSON-LD Article Schema | None | ❌ |
| OG Image | `/luxury-interior-finish-transformation.jpg` 1200×800 (same as avoid-mistakes EN but different declared size) | ⚠️ Generic — same image as another article |
| Internal Links | 2 fixed | ⚠️ |
| Alt Text | `"Architectural plans and professional quote review — Binyan Eitan"` | ✅ |
| Hreflang | No cross-link | ❌ |

#### HE `/he/expertise/reading-a-professional-quote`

| Parameter | Value | Status |
|-----------|-------|--------|
| Title (with template) | "איך לקרוא הצעת מחיר לבנייה ושיפוץ \| בניין איתן" (47c) | ⚠️ 3 chars short |
| Description | "המדריך המלא לקריאת הצעת מחיר מקצועית. איך מזהים \"חורים\" בהצעות זולות, למה פירוט הוא ההגנה הכי טובה שלכם ומה חובה להופיע בחוזה." (126c) | ⚠️ 14 chars short |
| H1 | Dynamic from DB | ✅ |
| JSON-LD Article Schema | None | ❌ |
| OG Image | `/luxury-interior-finish-transformation.jpg` 1200×800 | ⚠️ Same image as reading-quote EN + avoid-mistakes |
| Internal Links | 2 fixed | ⚠️ |
| Alt Text | `"תוכניות אדריכליות וסקירת הצעת מחיר מקצועית — בניין איתן"` | ✅ |
| Hreflang | No cross-link | ❌ |

---

## Critical Issues (❌)

### ❌ 1. No Article JSON-LD Schema — ALL 10 Pages
Every expertise page is missing an `Article` or `BlogPosting` structured data block. This is the most impactful SEO gap. Google uses Article schema to display rich results (headline, image, date) in search. The site-wide `LocalBusiness` schema in `en/layout.tsx` does not substitute for per-article schema.

**Missing fields across all pages:** `author`, `datePublished`, `dateModified`, `headline`, `image`, `publisher`.

### ❌ 2. Hreflang Missing on 8 of 10 Pages
Only `how-to-avoid-renovation-mistakes` has proper `alternates.languages` cross-linking between EN and HE. The remaining 4 articles (after-handover, behind-the-walls, building-from-abroad, reading-a-professional-quote) have no hreflang, meaning Google cannot reliably link the language versions and may index both as competing duplicates.

### ❌ 3. HE Titles Too Short — after-handover and avoid-mistakes
- `after-handover HE`: **41 chars** (with template) — 9 chars below minimum. Google sees a weak signal.
- `avoid-mistakes HE`: **39 chars** — weakest title in the audit.

### ❌ 4. reading-quote EN Description Too Long
At **177 chars**, it will be truncated at ~160 chars in Google's SERP snippet — the call-to-action gets cut off.

### ❌ 5. "Moti Eitan / מוטי איתן" in Metadata — building-from-abroad
Both EN and HE descriptions for `building-from-abroad` still name "Moti Eitan" / "מוטי איתן". This was recently corrected in the WhatsApp links but was not updated here. Inconsistency with the site's lead contact identity.

### ❌ 6. ArticleDetailPage.tsx WhatsApp HE Still Says "מוטי"
`ArticleDetailPage.tsx` line 11 has `WHATSAPP_HE` with "מוטי" in the URL-encoded message. Footer.tsx and Navbar.tsx were fixed, but this component was missed — all expertise article pages are affected.

---

## Improvements Recommended (⚠️)

### ⚠️ 1. EN Titles Slightly Over 60 Chars After Template
- `after-handover EN`: 68c — trim raw title by ~8 chars
- `behind-the-walls EN`: 69c — trim by ~9 chars
- `reading-quote EN`: 65c — trim by ~5 chars

### ⚠️ 2. Most HE Descriptions Too Short
All 5 HE descriptions are under 130 chars. Ideal is 140-160 chars:
- `after-handover HE`: 109c → needs ~40 more chars
- `behind-the-walls HE`: 105c → needs ~45 more chars
- `building-from-abroad HE`: 116c → needs ~35 more chars
- `avoid-mistakes HE`: 120c → needs ~25 more chars
- `reading-quote HE`: 126c → needs ~20 more chars

### ⚠️ 3. OG Image Dimensions — 1200×800 Not Optimal
8 of 10 pages use 1200×800 (3:2 ratio). Facebook and LinkedIn prefer **1200×630** (1.91:1 ratio). Images won't break sharing, but may have letterboxing on some platforms.

### ⚠️ 4. OG Image Reuse — Same Image on 3 Articles
`/luxury-interior-finish-transformation.jpg` is used as OG image for both `reading-quote` EN+HE and `avoid-mistakes` EN. When shared on social media, links to different articles will look identical.

### ⚠️ 5. Internal Links — Only 2 Fixed Links Per Article
Every article has the same 2 internal links (back to /expertise, sidebar #contact). No links to:
- `/he/about` / `/en/about` (The Firm / המשרד)
- `/he/projects` / `/en/projects` (portfolio)
- Other related articles in the body text

The `related` field in the DB drives the "Continue Reading" section, but it's not clear how many articles actually have this populated.

### ⚠️ 6. building-from-abroad EN Title — Low Search Intent Alignment
"Building Your Israeli Property From Abroad" (57c) is on-target for length, but misses common search queries like "renovation Israel overseas" or "build home Israel diaspora". Worth A/B testing.

### ⚠️ 7. avoid-mistakes EN Title — Generic and Short
"How to Avoid Renovation Mistakes" (47c with template) reads as generic. Adding a location qualifier ("...in Jerusalem" or "in Israel") would strengthen keyword relevance and reach the 50c minimum.

---

## Articles Doing Well (✅)

- **H1 structure** — All 10 pages have exactly one H1, rendered dynamically from the DB. H2 headings for sections are correctly implemented.
- **Alt text** — All hero images and related-article thumbnails use descriptive, contextual alt text (article titles). Not a single empty or filename-as-alt occurrence.
- **OG defined on all pages** — Unlike many sites, every article has explicit OG metadata (title, description, image, locale, type=article).
- **OG Image files exist** — All 4 referenced image files are present in `/public/`. No broken image references.
- **`metadataBase` set** — Root layout correctly sets `metadataBase: new URL("https://binyaneitan.com")`, ensuring relative image paths resolve correctly in OG tags.
- **how-to-avoid-renovation-mistakes** — Best-configured article: has hreflang ✅, best OG image dimensions ✅, separate OG image from other articles ✅, and separate keywords array in HE metadata.
- **Distinct EN/HE metadata** — All 10 pages have genuinely different titles, descriptions, and alt texts in EN vs HE. Not machine-translated copies.
- **`type: "article"`** — All OG objects declare `type: "article"`, which is correct for article content.
- **Canonical tags** — All 10 pages have explicit canonical URLs, preventing duplicate content issues from URL parameters.

---

## Top 5 Recommended Fixes (Priority Order)

### 🔴 Fix 1 — Add Article JSON-LD Schema to ArticleDetailPage.tsx
**Impact: HIGH | Effort: MEDIUM**

Add a `<script type="application/ld+json">` inside `ArticleDetailPage.tsx` rendering an `Article` or `BlogPosting` schema. It can be assembled from existing data (title, heroImage, slug).

Minimum viable schema per article:
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "<article title>",
  "image": "<heroImage URL>",
  "author": {
    "@type": "Person",
    "name": "Moti Eitan"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Binyan Eitan",
    "logo": "https://binyaneitan.com/logo.png"
  },
  "datePublished": "<article.created_at or hardcoded>",
  "url": "https://binyaneitan.com/<lang>/expertise/<slug>"
}
```
This can be done once in the shared component and will apply to all 10 pages.

---

### 🔴 Fix 2 — Add Hreflang to 4 Missing Articles
**Impact: HIGH | Effort: LOW**

Add `alternates.languages` to 4 articles that are missing it. Model on `how-to-avoid-renovation-mistakes`:

```ts
alternates: {
  canonical: "https://binyaneitan.com/en/expertise/after-handover",
  languages: {
    "en": "https://binyaneitan.com/en/expertise/after-handover",
    "he": "https://binyaneitan.com/he/expertise/after-handover",
  },
},
```

Apply to: `after-handover`, `behind-the-walls`, `building-from-abroad`, `reading-a-professional-quote` (8 files total, 4 EN + 4 HE).

---

### 🔴 Fix 3 — Fix "Moti Eitan" in ArticleDetailPage.tsx WhatsApp Link + Metadata
**Impact: MEDIUM-HIGH | Effort: LOW**

Two sub-fixes:
1. `ArticleDetailPage.tsx` line 11: `WHATSAPP_HE` — change "מוטי" → "חנן" (same fix done for Footer and Navbar).
2. `building-from-abroad` EN description: remove "with Moti Eitan" → "with Binyan Eitan" or just remove.
3. `building-from-abroad` HE description: remove "עם מוטי איתן".

---

### 🟡 Fix 4 — Expand HE Meta Descriptions (All 5 Articles)
**Impact: MEDIUM | Effort: MEDIUM**

All HE descriptions are 20-45 chars short of the 140-160 target. Expanding them will:
- Reduce the chance of Google auto-generating a snippet from page body
- Improve click-through rate in Hebrew search

Priority order for expansion:
1. `behind-the-walls HE` (105c — most deficient)
2. `after-handover HE` (109c)
3. `building-from-abroad HE` (116c)

---

### 🟡 Fix 5 — Trim EN Titles to Fit Template + 60-char Limit
**Impact: MEDIUM | Effort: LOW**

Three EN titles exceed 60 chars after the ` | Binyan Eitan` template is applied:

| Article | Current (with template) | Suggested trim |
|---------|------------------------|----------------|
| after-handover EN | 68c | Remove "Your Roadmap to" → "The Handover: Long-Term Peace of Mind" (55c+15=70)... or rename to "After Handover: Your Peace-of-Mind Guide" (53c+15=68)... Goal: raw ≤ 45c |
| behind-the-walls EN | 69c | "Behind the Walls: The Hidden Standard" → 37c+15=52c ✅ |
| reading-quote EN | 65c | "Beyond the Price: Reading a Construction Quote" → 47c+15=62c ⚠️ still over — aim for raw ≤ 45c |

---

## Notes & Observations

1. **`how-to-avoid-renovation-mistakes` is the template to follow** — it's the most complete article in the audit (has hreflang, best OG image, extra keywords array in HE). Whoever configured it last added the `alternates.languages` that the others are missing. The pattern should be retrofitted to all articles.

2. **The `reading-quote` EN and `avoid-mistakes` EN share the same OG image** (`luxury-interior-finish-transformation.jpg`). When a user shares both links on WhatsApp or LinkedIn, the previews will look identical — confusing and reduces brand differentiation.

3. **`/en/expertise/how-to-avoid-renovation-mistakes` has `robots: { index: true, follow: true }`** while no other articles have this — it's harmless (default is index/follow) but creates an inconsistency.

4. **`/he/expertise/how-to-avoid-renovation-mistakes` has a `keywords` array** while no other HE page does. While Google ignores `<meta name="keywords">`, it's an inconsistency suggesting this article was configured more carefully than the others.

5. **No `datePublished` anywhere** — If Article schema is added (Fix 1), you'll need publication dates. The Supabase `articles` table likely has `created_at` — that field should be surfaced to the component.

6. **ArticleDetailPage.tsx WhatsApp EN link** (line 13) says "Hi Moti" — this was not part of the recent fix scope but should be updated to "Hi Chanan" for consistency.

7. **`building-from-abroad` OG image (`/luxury-interior.jpg`)** is the most generic of all — a luxury interior shot that doesn't visually relate to "building from abroad". A photo of a video call, a map, or a remote handover would be more relevant for social sharing.
