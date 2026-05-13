import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { getAdminIdFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

const MAX_TITLE = 200;
const MAX_BODY  = 5000;

// PATCH — partial update. Only fields present in body are touched.
// Ownership enforced by adding admin_id to the WHERE clause (admins
// can only mutate their own notes).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminId = getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; body?: string; pinned?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "כותרת לא יכולה להיות ריקה" }, { status: 400 });
    if (t.length > MAX_TITLE) return NextResponse.json({ error: `כותרת ארוכה מדי (מקסימום ${MAX_TITLE})` }, { status: 400 });
    update.title = t;
  }
  if (body.body    !== undefined) update.body   = body.body.slice(0, MAX_BODY);
  if (body.pinned  !== undefined) update.pinned = !!body.pinned;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("admin_notes")
    .update(update)
    .eq("id", params.id)
    .eq("admin_id", adminId)
    .select("id, title, body, pinned, created_at, updated_at")
    .single();

  if (error) {
    console.error("[admin/notes PATCH]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  return NextResponse.json({ note: data });
}

// DELETE — remove a note (only own notes)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminId = getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from("admin_notes")
    .delete()
    .eq("id", params.id)
    .eq("admin_id", adminId);

  if (error) {
    console.error("[admin/notes DELETE]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
