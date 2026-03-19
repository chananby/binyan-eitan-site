import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");

  const supabase = createServerClient();
  let query = supabase
    .from("tasks")
    .select("id, project_id, task_name, start_date, end_date, contractor, status, notes, created_at, project:project_id(id, name)")
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

  let body: { project_id?: string; task_name?: string; start_date?: string; end_date?: string; contractor?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { project_id, task_name, start_date, end_date, contractor, notes } = body;
  if (!project_id || !task_name?.trim()) {
    return NextResponse.json({ error: "project_id ושם משימה הם שדות חובה" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id,
      task_name: task_name.trim(),
      start_date: start_date || null,
      end_date: end_date || null,
      contractor: contractor?.trim() || null,
      notes: notes?.trim() || null,
      status: "planned",
    })
    .select("id, project_id, task_name, start_date, end_date, contractor, status, notes, created_at")
    .single();

  if (error) {
    console.error("[admin/tasks POST]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ task: data }, { status: 201 });
}
