/**
 * PATCH  /api/admin/gallery/projects/[id] — update a project's fields.
 * DELETE /api/admin/gallery/projects/[id] — soft-delete (sets deleted_at).
 * Admin-only. Editing/removing projects in the gallery manager.
 *
 * DELETE is soft and leaves the project's gallery_images rows in place (they
 * simply stop being served because the public /api/gallery filters unpublished/
 * deleted projects) — recoverable, and no orphaned-image cleanup this round.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../../lib/admin-auth";

export const runtime = "nodejs";

const ASPECTS = new Set(["4/3", "3/4", "16/9", "1/1"]);
const COLS =
  "id, slug, url_slug, title_he, title_en, category_he, category_en, description_he, description_en, categories, aspect, sort_order, is_published, is_featured, created_at";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const textFields = [
    "url_slug", "title_he", "title_en", "category_he", "category_en",
    "description_he", "description_en",
  ] as const;
  for (const f of textFields) {
    if (typeof body[f] === "string") updates[f] = (body[f] as string).trim();
  }
  if (Array.isArray(body.categories)) {
    updates.categories = body.categories.filter((c): c is string => typeof c === "string");
  }
  if (typeof body.aspect === "string" && ASPECTS.has(body.aspect)) updates.aspect = body.aspect;
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    updates.sort_order = Math.trunc(body.sort_order);
  }
  if (typeof body.is_published === "boolean") updates.is_published = body.is_published;
  if (typeof body.is_featured === "boolean") updates.is_featured = body.is_featured;
  // slug is intentionally immutable — it keys gallery_images.project_slug.

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("gallery_projects")
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null)
    .select(COLS)
    .maybeSingle();

  if (error) {
    console.error("[admin/gallery/projects PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("gallery_projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/gallery/projects DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
