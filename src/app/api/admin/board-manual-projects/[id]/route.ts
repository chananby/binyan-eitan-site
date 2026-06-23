/**
 * DELETE /api/admin/board-manual-projects/[id] — remove a manual site.
 *
 * Safety contract: refuses to delete while any assignment row still
 * references this site's name (`project_name=<name>`). 409 with a
 * count so the UI can say "still 3 workers on this column — move
 * them first". Workers don't get silently kicked off the board.
 *
 * Admin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Look up the row first so we have its name for the assignment check
  // and so we can return a clean 404 if it's gone.
  const { data: row, error: fetchErr } = await supabase
    .from("board_manual_projects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) {
    console.error("[admin/board-manual-projects DELETE] fetch:", JSON.stringify(fetchErr));
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "אתר לא נמצא" }, { status: 404 });
  }

  // Block delete while any assignment still names this site. Counts
  // both real workers and manual labels.
  const { count, error: countErr } = await supabase
    .from("board_assignments")
    .select("*", { count: "exact", head: true })
    .eq("project_name", row.name);
  if (countErr) {
    console.error("[admin/board-manual-projects DELETE] count:", JSON.stringify(countErr));
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `נותרו ${count} עובדים באתר זה — העבר אותם קודם.`, assignments_remaining: count },
      { status: 409 },
    );
  }

  const { error: delErr } = await supabase
    .from("board_manual_projects")
    .delete()
    .eq("id", id);
  if (delErr) {
    console.error("[admin/board-manual-projects DELETE]", JSON.stringify(delErr));
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
