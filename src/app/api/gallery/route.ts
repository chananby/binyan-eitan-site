/**
 * GET /api/gallery — PUBLIC. Assembles the marketing gallery from the DB
 * (gallery_projects + gallery_images) in the exact GalleryProject shape the
 * public ProjectsGallery renders, so the component's mapping stays unchanged.
 *
 * Ordering: gallery_projects.sort_order, then gallery_images.sort_order.
 * Filters: is_published = true, deleted_at IS NULL (both tables).
 *
 * SAFETY: on ANY failure — or if there are simply no published projects — this
 * returns []. The client (ProjectsGallery) only replaces its static data when
 * the array is non-empty, so an empty/failed response silently keeps the
 * hard-coded GALLERY_PROJECTS fallback and the public site never breaks.
 *
 * CACHING: force-dynamic (so it always reflects the DB) + a 60 s CDN cache
 * header, so an admin edit propagates to the public site within ~60 s while the
 * origin isn't hit on every visit. `num` is derived from published order.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProjectRow {
  slug: string;
  url_slug: string;
  title_he: string;
  title_en: string;
  category_he: string;
  category_en: string;
  description_he: string;
  description_en: string;
  categories: string[] | null;
  aspect: string;
  sort_order: number;
}
interface ImageRow {
  project_slug: string;
  url: string;
  sort_order: number;
  is_cover: boolean;
}

export async function GET() {
  try {
    const supabase = createServerClient();

    const [projRes, imgRes] = await Promise.all([
      supabase
        .from("gallery_projects")
        .select(
          "slug, url_slug, title_he, title_en, category_he, category_en, description_he, description_en, categories, aspect, sort_order",
        )
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true }),
      supabase
        .from("gallery_images")
        .select("project_slug, url, sort_order, is_cover")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true }),
    ]);

    if (projRes.error || imgRes.error) {
      console.error("[api/gallery]", JSON.stringify(projRes.error ?? imgRes.error));
      return NextResponse.json([]); // → client keeps static fallback
    }

    const projects = (projRes.data ?? []) as ProjectRow[];
    const images = (imgRes.data ?? []) as ImageRow[];

    // Group images by project (already sorted by sort_order from the query).
    const byProject = new Map<string, ImageRow[]>();
    for (const im of images) {
      const list = byProject.get(im.project_slug);
      if (list) list.push(im);
      else byProject.set(im.project_slug, [im]);
    }

    // Drop projects with zero images FIRST (the card needs a cover), and only
    // then number them. Numbering before the filter left holes in the sequence
    // (01-05, 07…) because a dropped project still consumed its number.
    // `num` is display-only: sort_order decides the ORDER, position decides the
    // label, so gaps in sort_order never surface to the visitor.
    const withImages = projects
      .filter((p) => (byProject.get(p.slug)?.length ?? 0) > 0)
      .map((p, i) => {
        const imgs = byProject.get(p.slug) ?? [];
        const cover = imgs.find((im) => im.is_cover)?.url ?? imgs[0]?.url ?? "";
        return {
          id: p.slug,
          urlSlug: p.url_slug,
          num: String(i + 1).padStart(2, "0"),
          cover,
          aspect: (p.aspect || "4/3") as "4/3" | "3/4" | "16/9" | "1/1",
          images: imgs.map((im) => im.url),
          categories: p.categories ?? [],
          he: { title: p.title_he, category: p.category_he, shortDesc: p.description_he },
          en: { title: p.title_en, category: p.category_en, shortDesc: p.description_en },
        };
      });

    return NextResponse.json(withImages, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    console.error("[api/gallery] threw", e);
    return NextResponse.json([]); // → client keeps static fallback
  }
}
