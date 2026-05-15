import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { getAdminIdFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const MAX_TITLE = 200;
const MAX_BODY  = 5000;

// GET — list current admin's notes (pinned first, then newest)
export async function GET(req: NextRequest) {
  const adminId = getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit  = Math.min(parseInt(searchParams.get("limit")  || "200", 10), 500);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0",   10), 0);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("admin_notes")
    .select("id, title, body, pinned, created_at, updated_at")
    .eq("admin_id", adminId)
    .order("pinned",      { ascending: false })
    .order("updated_at",  { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[admin/notes GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ notes: data ?? [] });
}

// POST { title, body?, pinned? }
export async function POST(req: NextRequest) {
  const adminId = getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; body?: string; pinned?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "כותרת חובה" }, { status: 400 });
  if (title.length > MAX_TITLE) {
    return NextResponse.json({ error: `כותרת ארוכה מדי (מקסימום ${MAX_TITLE})` }, { status: 400 });
  }
  const noteBody = (body.body ?? "").slice(0, MAX_BODY);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("admin_notes")
    .insert({
      admin_id: adminId,
      title,
      body: noteBody,
      pinned: !!body.pinned,
    })
    .select("id, title, body, pinned, created_at, updated_at")
    .single();

  if (error) {
    console.error("[admin/notes POST]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ note: data }, { status: 201 });
}
