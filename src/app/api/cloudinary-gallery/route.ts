/**
 * GET /api/cloudinary-gallery
 *
 * Fetches images from Cloudinary and returns a structured GalleryProject[].
 * Cached for 60 seconds (Next.js ISR-style revalidation).
 *
 * ─── Tagging convention in Cloudinary ───────────────────────────────────────
 *
 *  Every image in the "binyan-eitan" folder should have:
 *
 *  1. PROJECT TAG  — which project it belongs to:
 *       project:amshinov
 *       project:bayit-vegan
 *       project:ohel-avshalom
 *       project:ramat-eshkol
 *       project:jerusalem-luxury
 *       (or any new project ID you add to PROJECT_META below)
 *
 *  2. CATEGORY TAG  — at least one filter category (set per image or per project):
 *       category:construction   → בינוי
 *       category:renovations    → שיפוצים
 *       category:finish         → עבודות גמר
 *       category:infrastructure → תשתיות
 *       category:plastering     → טיח
 *       category:painting       → צבע
 *       category:waterproofing  → איטום
 *       category:tiling         → ריצוף וחיפוי
 *       category:aluminum       → אלומיניום
 *       category:drywall        → גבס
 *       category:ac             → מיזוג אוויר
 *       category:carpentry      → נגרות
 *       category:handover       → ניקיון ומסירה
 *       category:before-after   → לפני ואחרי
 *
 *       Tags are matched case-insensitively ("Category:Painting" = "category:painting").
 *
 *  3. COVER TAG (optional, one image per project):
 *       cover
 *       The tagged image becomes the masonry card thumbnail.
 *       If absent, the first image (sorted by public_id) is used.
 *
 *  Example tags for a single image:
 *    [ "project:amshinov", "category:infrastructure", "cover" ]
 *
 * ─── Adding a new project ───────────────────────────────────────────────────
 *  1. Add an entry to PROJECT_META below.
 *  2. Upload images to Cloudinary folder "binyan-eitan" with the correct tags.
 *  3. The project appears on the site within 60 seconds — no deploy needed.
 *
 * ─── Making a change appear instantly ──────────────────────────────────────
 *  Hit: POST /api/revalidate?secret=<REVALIDATE_SECRET>&path=/he/projects
 *  (see /api/revalidate/route.ts)
 */

import { NextResponse } from "next/server";
import type { GalleryProject, ProjectCategory } from "../../../lib/projects";

// Cache for 60 seconds — change to a lower value for faster propagation,
// or use the /api/revalidate endpoint to flush immediately.
export const revalidate = 60;

// ── Project metadata ─────────────────────────────────────────────────────────
// Things Cloudinary can't tell us: display order, aspect ratio, bilingual titles.
// Add one entry here per project; everything else (images, categories) comes from tags.

interface ProjectMeta {
  num: string;
  order: number;
  aspect: GalleryProject["aspect"];
  /** Fallback categories used when the image has no category:* tags */
  defaultCategories: ProjectCategory[];
  he: GalleryProject["he"];
  en: GalleryProject["en"];
}

const PROJECT_META: Record<string, ProjectMeta> = {
  amshinov: {
    num: "01",
    order: 1,
    aspect: "4/3",
    defaultCategories: ["infrastructure"],
    he: {
      title: "קומפלקס אמשינוב",
      category: "תשתיות ציבוריות",
      shortDesc: "ביצוע מדויק באזור עירוני עמוס, עם פתרונות הרמה ותכנון לוגיסטי מורכב.",
    },
    en: {
      title: "Amshinov Complex",
      category: "Public Infrastructure",
      shortDesc: "Precision execution in high-traffic urban zones, with complex crane logistics and access management.",
    },
  },
  "bayit-vegan": {
    num: "02",
    order: 2,
    aspect: "3/4",
    defaultCategories: ["renovations"],
    he: {
      title: "בית וגן ירושלים",
      category: "שיפוץ מבני",
      shortDesc: "החלפת תשתיות מלאה ותוספת מבנית בבניין קיים — עם שמירה על רצף הפעילות.",
    },
    en: {
      title: "Bayit Vegan JLM",
      category: "Structural Renovation",
      shortDesc: "Complete infrastructure replacement and structural expansion in an existing residential building.",
    },
  },
  "ohel-avshalom": {
    num: "03",
    order: 3,
    aspect: "4/3",
    defaultCategories: ["renovations", "infrastructure"],
    he: {
      title: "מוסדות אוהל אבשלום",
      category: "מוסדות ציבור",
      shortDesc: "הרחבות ותוספות בבניין ציבורי פעיל — עם ניהול שלבי קפדני ואפס הפרעה לפעילות.",
    },
    en: {
      title: "Ohel Avshalom Institutions",
      category: "Public Institutions",
      shortDesc: "Expansions and additions within an active public building, with strict phased management.",
    },
  },
  "ramat-eshkol": {
    num: "04",
    order: 4,
    aspect: "3/4",
    defaultCategories: ["finish"],
    he: {
      title: "פנטהאוס רמת אשכול",
      category: "עבודות גמר פרימיום",
      shortDesc: "לוגיסטיקה מורכבת בקומה גבוהה עם חידוש תשתיות מתקדמות ועיצוב פנים יוקרתי.",
    },
    en: {
      title: "Ramat Eshkol Penthouse",
      category: "Premium Finish Work",
      shortDesc: "High-floor logistics with advanced infrastructure renewal and luxury interior detailing.",
    },
  },
  "jerusalem-luxury": {
    num: "05",
    order: 5,
    aspect: "16/9",
    defaultCategories: ["finish", "renovations"],
    he: {
      title: "דירת יוקרה ירושלים",
      category: "שיפוץ יוקרה",
      shortDesc: "שיפוץ מוחלט של דירה יוקרתית בירושלים — עם חיפויי אבן ירושלמית ועבודות גמר פרימיום.",
    },
    en: {
      title: "Jerusalem Luxury Apartment",
      category: "Luxury Renovation",
      shortDesc: "Full gut renovation of a high-end Jerusalem apartment with Jerusalem stone cladding and premium finishes.",
    },
  },
};

// ── Cloudinary types ─────────────────────────────────────────────────────────

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  tags?: string[];
}

interface CloudinarySearchResponse {
  resources: CloudinaryResource[];
  next_cursor?: string;
  total_count: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function deliveryUrl(publicId: string, transforms = "f_auto,q_auto,w_1920"): string {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  return `https://res.cloudinary.com/${cloud}/image/upload/${transforms}/${publicId}`;
}

async function fetchCloudinaryPage(
  auth: string,
  cloud: string,
  cursor?: string
): Promise<CloudinarySearchResponse> {
  const body: Record<string, unknown> = {
    expression: "folder:binyan-eitan",
    with_field: ["tags"],
    sort_by: [{ public_id: "asc" }],
    max_results: 500,
  };
  if (cursor) body.next_cursor = cursor;

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/resources/search`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
      // Next.js fetch cache — revalidates every 60 seconds
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary credentials not configured" },
      { status: 500 }
    );
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  // Fetch all pages (handles >500 images via pagination)
  let allResources: CloudinaryResource[] = [];
  let cursor: string | undefined;
  try {
    do {
      const page = await fetchCloudinaryPage(auth, cloud, cursor);
      allResources = allResources.concat(page.resources);
      cursor = page.next_cursor;
    } while (cursor);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // ── Group images by project tag ──────────────────────────────────────────
  const projectMap = new Map<
    string,
    { images: CloudinaryResource[]; categories: Set<ProjectCategory> }
  >();

  for (const resource of allResources) {
    // Normalise all tags to lowercase before matching
    const normalizedTags = (resource.tags ?? []).map((t) => t.toLowerCase());

    const projectTag = normalizedTags.find((t) => t.startsWith("project:"));
    if (!projectTag) continue; // skip untagged images

    const projectId = projectTag.replace("project:", "");

    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, { images: [], categories: new Set() });
    }

    const entry = projectMap.get(projectId)!;
    entry.images.push(resource);

    // Collect category tags from this image (already lowercased)
    for (const tag of normalizedTags) {
      if (tag.startsWith("category:")) {
        const cat = tag.replace("category:", "") as ProjectCategory;
        entry.categories.add(cat);
      }
    }
  }

  // ── Build GalleryProject[] ───────────────────────────────────────────────
  const projects: GalleryProject[] = [];

  for (const [projectId, { images, categories }] of projectMap) {
    const meta = PROJECT_META[projectId];
    if (!meta) continue; // unknown project ID — add to PROJECT_META to include

    // Sort: cover-tagged image first, then alphabetically by public_id
    const sorted = [...images].sort((a, b) => {
      const aCover = a.tags?.some((t) => t.toLowerCase() === "cover") ? 0 : 1;
      const bCover = b.tags?.some((t) => t.toLowerCase() === "cover") ? 0 : 1;
      if (aCover !== bCover) return aCover - bCover;
      return a.public_id.localeCompare(b.public_id);
    });

    const resolvedCategories: ProjectCategory[] =
      categories.size > 0 ? [...categories] : meta.defaultCategories;

    projects.push({
      id: projectId,
      num: meta.num,
      cover: deliveryUrl(sorted[0].public_id),
      aspect: meta.aspect,
      images: sorted.map((r) => deliveryUrl(r.public_id)),
      categories: resolvedCategories,
      he: meta.he,
      en: meta.en,
    });
  }

  // Sort by defined display order
  projects.sort(
    (a, b) => (PROJECT_META[a.id]?.order ?? 99) - (PROJECT_META[b.id]?.order ?? 99)
  );

  return NextResponse.json(projects, {
    headers: {
      // Allow CDN / browser to cache for 60 seconds
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
