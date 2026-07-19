/**
 * PATCH  /api/admin/gallery/[id] — update sort_order / is_cover / category / alt.
 * DELETE /api/admin/gallery/[id] — soft-delete (sets deleted_at).
 * Admin-only. Powers reorder, set-cover, and delete in the gallery manager.
 *
 * Setting is_cover=true clears the flag on the project's other live rows here
 * (at most one cover per project) — enforced in the API, not by a DB constraint.
 * DELETE is soft (deleted_at) so a mistaken delete is recoverable; the Blob
 * object itself is left in place (cheap, public CDN — no cleanup this round).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

const SELECT_COLS = "id, project_slug, url, sort_order, is_cover, category, alt_he, alt_en, created_at";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    sort_order?: unknown;
    is_cover?: unknown;
    category?: unknown;
    alt_he?: unknown;
    alt_en?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    updates.sort_order = Math.trunc(body.sort_order);
  }
  if (typeof body.is_cover === "boolean") updates.is_cover = body.is_cover;
  if (typeof body.category === "string") updates.category = body.category.trim() || null;
  else if (body.category === null) updates.category = null;
  if (typeof body.alt_he === "string") updates.alt_he = body.alt_he.trim() || null;
  if (typeof body.alt_en === "string") updates.alt_en = body.alt_en.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Promoting a cover → demote the project's other live covers first.
  if (updates.is_cover === true) {
    const { data: row, error: findErr } = await supabase
      .from("gallery_images")
      .select("project_slug")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (findErr) {
      console.error("[admin/gallery PATCH find]", JSON.stringify(findErr));
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { error: clearErr } = await supabase
      .from("gallery_images")
      .update({ is_cover: false })
      .eq("project_slug", row.project_slug)
      .neq("id", id)
      .is("deleted_at", null);
    if (clearErr) {
      console.error("[admin/gallery PATCH clear-cover]", JSON.stringify(clearErr));
      return NextResponse.json({ error: clearErr.message }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from("gallery_images")
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null)
    .select(SELECT_COLS)
    .maybeSingle();

  if (error) {
    console.error("[admin/gallery PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ image: data });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/gallery DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
