import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAuthedFromRequest, isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { status?: string; name?: string; description?: string; target_date?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!["pending", "in_progress", "completed"].includes(body.status)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.name        !== undefined) update.name        = body.name?.trim() || null;
  if (body.description !== undefined) update.description = body.description?.trim() || null;
  if (body.target_date !== undefined) update.target_date = body.target_date || null;

  if (!Object.keys(update).length) return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("milestones")
    .update(update)
    .eq("id", params.id)
    .select("id, project_id, name, description, target_date, status, created_at")
    .single();

  if (error) {
    console.error("[admin/milestones PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ milestone: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { error } = await supabase.from("milestones").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
