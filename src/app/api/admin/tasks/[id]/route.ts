import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest, isAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { status?: string; task_name?: string; start_date?: string; end_date?: string; contractor?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!["planned", "in_progress", "completed"].includes(body.status)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.task_name !== undefined) update.task_name = body.task_name.trim();
  if (body.start_date !== undefined) update.start_date = body.start_date || null;
  if (body.end_date   !== undefined) update.end_date   = body.end_date   || null;
  if (body.contractor !== undefined) update.contractor = body.contractor?.trim() || null;
  if (body.notes      !== undefined) update.notes      = body.notes?.trim() || null;

  if (!Object.keys(update).length) return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", params.id)
    .select("id, project_id, task_name, start_date, end_date, contractor, status, notes")
    .single();

  if (error) {
    console.error("[admin/tasks PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ task: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
