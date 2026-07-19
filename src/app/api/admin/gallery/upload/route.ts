/**
 * POST /api/admin/gallery/upload — admin-only marketing-gallery image upload.
 *
 * Rides on the same Vercel Blob infra as /api/upload (change-order photos) but:
 *   • admin-gated (isAdminAuthedFromRequest), not same-origin+rate-limit,
 *   • stores under a separate `gallery/<project_slug>/` prefix,
 *   • also inserts a gallery_images row so the manager can list/order/delete.
 *
 * ONE FILE PER REQUEST — the client resizes each image (lib/image-resize) and
 * fires these in parallel (bounded), so every file gets its own progress tick
 * and a failure isolates to that file instead of dropping the whole batch.
 *
 * The image is expected to be pre-shrunk on the client (~1920px, q0.8). The
 * server still enforces a hard cap as a backstop. Does NOT touch the existing
 * /api/upload route or the hard-coded public gallery.
 */

import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // backstop — client sends ~200–500 KB

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const EXT_FROM_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Only allow project slugs made of the safe charset GALLERY_PROJECTS uses, so a
// crafted value can't escape the gallery/ prefix into another Blob path.
const SLUG_RE = /^[a-z0-9-]{1,64}$/;

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not configured" }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const projectSlug = String(form.get("project_slug") || "").trim();
  if (!SLUG_RE.test(projectSlug)) {
    return NextResponse.json({ error: "Invalid or missing project_slug" }, { status: 400 });
  }
  const categoryRaw = form.get("category");
  const category = typeof categoryRaw === "string" && categoryRaw.trim() ? categoryRaw.trim() : null;

  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (typeof file.size === "number" && file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 });
  }
  const declaredType = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(declaredType)) {
    return NextResponse.json(
      { error: `Unsupported file type${declaredType ? `: ${declaredType}` : ""}` },
      { status: 415 },
    );
  }

  // Extension from MIME (not the user filename) — no traversal / spoofing.
  const ext = EXT_FROM_MIME[declaredType] ?? "bin";
  const random = Math.random().toString(36).slice(2, 10);
  const blobName = `gallery/${projectSlug}/${Date.now()}-${random}.${ext}`;

  let url: string;
  try {
    const blob = await put(blobName, file.stream(), { access: "public", contentType: declaredType });
    url = blob.url;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Append to the end of the project's order: next sort_order = max(live) + 1.
  const supabase = createServerClient();
  const { data: last } = await supabase
    .from("gallery_images")
    .select("sort_order")
    .eq("project_slug", projectSlug)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? -1) + 1;

  const { data: row, error } = await supabase
    .from("gallery_images")
    .insert({ project_slug: projectSlug, url, sort_order: nextOrder, category })
    .select("id, project_slug, url, sort_order, is_cover, category, alt_he, alt_en, created_at")
    .maybeSingle();

  if (error) {
    // Blob is already stored; surface the DB failure so the client marks this
    // file failed (the batch continues). Orphan blob is acceptable/rare.
    console.error("[admin/gallery/upload insert]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ image: row });
}
