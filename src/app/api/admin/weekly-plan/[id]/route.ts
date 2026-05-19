import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

const VALID_ORDER = ["none", "ordered", "in_transit", "delivered"];

// PATCH — update a row
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const update: Record<string, unknown> = {};
  if (body.task_name      !== undefined) update.task_name      = String(body.task_name).trim();
  if (body.subcontractor  !== undefined) update.subcontractor  = body.subcontractor  || null;
  if (body.workers_needed !== undefined) update.workers_needed = Number(body.workers_needed) || 0;
  if (body.materials      !== undefined) update.materials      = body.materials      || null;
  if (body.supplier       !== undefined) update.supplier       = body.supplier       || null;
  if (body.order_status   !== undefined) {
    update.order_status = VALID_ORDER.includes(String(body.order_status)) ? body.order_status : "none";
  }
  if (body.planned_cost   !== undefined) update.planned_cost   = Number(body.planned_cost) || 0;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("weekly_plan")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data });
}

// DELETE — remove a row
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("weekly_plan").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
