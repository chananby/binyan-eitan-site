/**
 * /api/admin/board-manual-projects — ad-hoc "manual" sites that exist
 * only on the assignment board, not in the real projects table.
 *
 * The board lets admins spin up transient columns ("בית שמש זמני",
 * "ניקיון בערב") without polluting `projects`. Until improvement 1
 * this name lived implicitly inside the first assignment — no
 * assignment, no column. Now the column is persistent: created by
 * POST here, listed in GET /api/admin/board-assignments, deleted
 * explicitly (and only when empty) so a misclick can't sweep away
 * everyone on the column.
 *
 *   POST   { name }         — admin. Inserts a row; 23505 (already
 *                             exists, case/whitespace-normalised) is
 *                             treated as success and returns the
 *                             existing row.
 *
 * DELETE on a specific id lives at the [id] sibling route — Next.js
 * dynamic-route convention. It also enforces "empty before delete":
 * if any assignment still names this site, we 409 with a count.
 *
 * Admin only. service_role; RLS on with no policies — same posture
 * as quotes/catalog_items/board_assignments.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const COLUMNS = "id, name, created_at";

function tidyName(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

// ── POST — create a manual site (idempotent on the unique norm name) ──────
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const name = typeof body.name === "string" ? tidyName(body.name) : "";
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ error: "name too long" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("board_manual_projects")
    .insert({ name })
    .select(COLUMNS)
    .single();

  if (error) {
    // 23505 on the case-insensitive unique index → an admin already
    // created this column. Fetch and return it so the client UX is
    // "your column appeared" either way.
    if ((error as { code?: string }).code === "23505") {
      const { data: existing, error: lookupErr } = await supabase
        .from("board_manual_projects")
        .select(COLUMNS)
        .ilike("name", name)
        .limit(1)
        .maybeSingle();
      if (lookupErr || !existing) {
        console.error("[admin/board-manual-projects POST] dup lookup failed:", lookupErr);
        return NextResponse.json({ error: "duplicate but lookup failed" }, { status: 500 });
      }
      return NextResponse.json({ manual_project: existing, existed: true });
    }
    console.error("[admin/board-manual-projects POST]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ manual_project: data, existed: false }, { status: 201 });
}
