import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isExecAuthedFromRequest } from "../../../../../lib/exec-auth";

export const runtime = "nodejs";

/** PATCH — update item fields */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isExecAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const allowed: Record<string, unknown> = {};
  if (typeof body.done     === "boolean") allowed.done     = body.done;
  if (typeof body.content  === "string")  allowed.content  = body.content.trim();
  if (typeof body.priority === "number")  allowed.priority = body.priority;
  if (typeof body.due_date === "string")  allowed.due_date = body.due_date;
  if (typeof body.category === "string")  allowed.category = body.category;
  allowed.updated_at = new Date().toISOString();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("executive_space")
    .update(allowed)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

/** DELETE — remove item */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isExecAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("executive_space")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
