/**
 * GET  /api/admin/gallery/projects — list all live projects (incl. unpublished).
 * POST /api/admin/gallery/projects — create a project.
 * Admin-only. Powers the project manager in GalleryTab and its upload picker.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const ASPECTS = new Set(["4/3", "3/4", "16/9", "1/1"]);
const COLS =
  "id, slug, url_slug, title_he, title_en, category_he, category_en, description_he, description_en, categories, aspect, sort_order, is_published, is_featured, created_at";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("gallery_projects")
    .select(COLS)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/gallery/projects GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim();
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "slug חייב להיות אותיות קטנות/מספרים/מקפים" }, { status: 400 });
  }
  const aspect = typeof body.aspect === "string" && ASPECTS.has(body.aspect) ? body.aspect : "4/3";
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c): c is string => typeof c === "string")
    : [];

  const supabase = createServerClient();

  // Append to the end of the gallery order.
  const { data: last } = await supabase
    .from("gallery_projects")
    .select("sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order =
    typeof body.sort_order === "number" ? Math.trunc(body.sort_order) : (last?.sort_order ?? -1) + 1;

  const row = {
    slug,
    url_slug: String(body.url_slug ?? "").trim(),
    title_he: String(body.title_he ?? "").trim(),
    title_en: String(body.title_en ?? "").trim(),
    category_he: String(body.category_he ?? "").trim(),
    category_en: String(body.category_en ?? "").trim(),
    description_he: String(body.description_he ?? "").trim(),
    description_en: String(body.description_en ?? "").trim(),
    categories,
    aspect,
    sort_order,
    is_published: body.is_published === undefined ? true : Boolean(body.is_published),
    // Never auto-feature: a new project must be opted in to the home page.
    is_featured: body.is_featured === undefined ? false : Boolean(body.is_featured),
  };

  const { data, error } = await supabase.from("gallery_projects").insert(row).select(COLS).maybeSingle();
  if (error) {
    // 23505 = unique_violation on slug.
    const msg = error.code === "23505" ? "slug כבר קיים" : error.message;
    console.error("[admin/gallery/projects POST]", JSON.stringify(error));
    return NextResponse.json({ error: msg }, { status: error.code === "23505" ? 409 : 500 });
  }
  return NextResponse.json({ project: data });
}
