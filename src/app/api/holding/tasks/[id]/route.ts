import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isExecAuthedFromRequest } from "../../../../../lib/exec-auth";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isExecAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const ALLOWED = ["title", "notes", "status", "priority", "company_id"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ALLOWED) { if (k in body) update[k] = body[k]; }

  const VALID_STATUS = ["backlog", "urgent", "in_progress", "pending", "done"];
  if (update.status && !VALID_STATUS.includes(update.status as string))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("holding_tasks")
    .update(update)
    .eq("id", params.id)
    .select("*, holding_companies(id, name, color, icon)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isExecAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { error } = await supabase.from("holding_tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
