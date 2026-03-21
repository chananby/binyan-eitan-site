import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest, isAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

const VALID_STATUSES = ["planned", "in_progress", "delayed", "completed"];
const VALID_DELAY_REASONS = ["workers", "material", "weather", "subcontractor"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    status?: string; task_name?: string; start_date?: string; end_date?: string;
    contractor?: string; notes?: string; milestone_id?: string | null;
    material_ready?: boolean; sub_confirmed?: boolean; equipment_on_site?: boolean;
    delay_reason?: string | null;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    update.status = body.status;
    // When clearing delay status, also clear the reason
    if (body.status !== "delayed") update.delay_reason = null;
  }

  if (body.delay_reason !== undefined) {
    if (body.delay_reason && !VALID_DELAY_REASONS.includes(body.delay_reason)) {
      return NextResponse.json({ error: "סיבת עיכוב לא תקינה" }, { status: 400 });
    }
    update.delay_reason = body.delay_reason || null;
  }

  if (body.task_name        !== undefined) update.task_name         = body.task_name.trim();
  if (body.start_date       !== undefined) update.start_date        = body.start_date || null;
  if (body.end_date         !== undefined) update.end_date          = body.end_date   || null;
  if (body.contractor       !== undefined) update.contractor        = body.contractor?.trim() || null;
  if (body.notes            !== undefined) update.notes             = body.notes?.trim()      || null;
  if (body.milestone_id     !== undefined) update.milestone_id      = body.milestone_id       || null;
  if (body.material_ready   !== undefined) update.material_ready    = !!body.material_ready;
  if (body.sub_confirmed    !== undefined) update.sub_confirmed     = !!body.sub_confirmed;
  if (body.equipment_on_site !== undefined) update.equipment_on_site = !!body.equipment_on_site;

  if (!Object.keys(update).length) return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", params.id)
    .select("id, project_id, milestone_id, task_name, start_date, end_date, contractor, status, notes, material_ready, sub_confirmed, equipment_on_site, delay_reason")
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
