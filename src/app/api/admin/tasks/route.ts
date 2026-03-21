import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const TASK_SELECT = "id, project_id, milestone_id, task_name, start_date, end_date, contractor, status, notes, material_ready, sub_confirmed, equipment_on_site, delay_reason, created_at, project:project_id(id, name)";

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");

  const supabase = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .order("start_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) {
    console.error("[admin/tasks GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    project_id?: string; milestone_id?: string; task_name?: string;
    start_date?: string; end_date?: string; contractor?: string; notes?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { project_id, milestone_id, task_name, start_date, end_date, contractor, notes } = body;
  if (!project_id || !task_name?.trim()) {
    return NextResponse.json({ error: "project_id ושם משימה הם שדות חובה" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id,
      milestone_id:      milestone_id || null,
      task_name:         task_name.trim(),
      start_date:        start_date || null,
      end_date:          end_date   || null,
      contractor:        contractor?.trim() || null,
      notes:             notes?.trim() || null,
      status:            "planned",
      material_ready:    false,
      sub_confirmed:     false,
      equipment_on_site: false,
    })
    .select(TASK_SELECT)
    .single();

  if (error) {
    console.error("[admin/tasks POST]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ task: data }, { status: 201 });
}
