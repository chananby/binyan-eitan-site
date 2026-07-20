/**
 * Server-side loader for the SLIM project page — the one built automatically
 * from a gallery_projects row for projects Chanan adds in the admin.
 *
 * The five original projects have hand-written rich pages in src/data/projects
 * and are served from there; this is only consulted when the slug ISN'T one of
 * those. Nothing here touches that data or those pages.
 *
 * Everything rendered comes from fields that already exist in the gallery form —
 * no new columns, nothing extra for Chanan to fill in.
 *
 * Any failure returns null so the route can answer a clean 404 instead of
 * crashing the public site.
 */

import { createServerClient } from "./supabase";

export interface DbProjectPageData {
  slug: string;
  urlSlug: string;
  title: string;
  category: string;
  description: string;
  /** Cover first, then the rest by sort_order. */
  images: string[];
  cover: string;
}

interface ProjectRow {
  slug: string;
  url_slug: string;
  title_he: string;
  title_en: string;
  category_he: string;
  category_en: string;
  description_he: string;
  description_en: string;
}
interface ImageRow {
  url: string;
  sort_order: number;
  is_cover: boolean;
}

/**
 * Look up a published gallery project by its url_slug, with its images.
 * Returns null when not found, unpublished, imageless, or on any error.
 */
export async function loadDbProjectPage(
  urlSlug: string,
  lang: "he" | "en",
): Promise<DbProjectPageData | null> {
  if (!urlSlug) return null;
  try {
    const supabase = createServerClient();

    const { data: proj, error: projErr } = await supabase
      .from("gallery_projects")
      .select(
        "slug, url_slug, title_he, title_en, category_he, category_en, description_he, description_en",
      )
      .eq("url_slug", urlSlug)
      .eq("is_published", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (projErr || !proj) return null;
    const p = proj as ProjectRow;

    const { data: imgs, error: imgErr } = await supabase
      .from("gallery_images")
      .select("url, sort_order, is_cover")
      .eq("project_slug", p.slug)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });

    if (imgErr) return null;
    const rows = (imgs ?? []) as ImageRow[];
    if (rows.length === 0) return null; // nothing to show → treat as missing

    // Cover leads; the rest keep their sort_order.
    const cover = rows.find((r) => r.is_cover)?.url ?? rows[0].url;
    const images = [cover, ...rows.map((r) => r.url).filter((u) => u !== cover)];

    return {
      slug: p.slug,
      urlSlug: p.url_slug,
      title: (lang === "he" ? p.title_he : p.title_en) || p.title_he || p.slug,
      category: (lang === "he" ? p.category_he : p.category_en) || "",
      description: (lang === "he" ? p.description_he : p.description_en) || "",
      images,
      cover,
    };
  } catch {
    return null; // never crash the public site
  }
}
