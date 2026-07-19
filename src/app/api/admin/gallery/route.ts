/**
 * GET /api/admin/gallery?project=<slug> — admin-only.
 * Lists live gallery_images for one project, ordered by sort_order. Feeds the
 * admin gallery manager's grid. Read-only; the public gallery does not use this
 * (round 1 = management only).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = (req.nextUrl.searchParams.get("project") || "").trim();
  if (!SLUG_RE.test(project)) {
    return NextResponse.json({ error: "Invalid or missing project" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("id, project_slug, url, sort_order, is_cover, category, alt_he, alt_en, created_at")
    .eq("project_slug", project)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/gallery GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ images: data ?? [] });
}
