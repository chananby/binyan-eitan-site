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
    .from("milestones")
    .select("id, project_id, name, description, target_date, status, created_at, project:project_id(id, name)")
    .order("target_date", { ascending: true })
    .order("created_at",  { ascending: true });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) {
    console.error("[admin/milestones GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ milestones: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { project_id?: string; name?: string; description?: string; target_date?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { project_id, name, description, target_date } = body;
  if (!project_id || !name?.trim()) {
    return NextResponse.json({ error: "project_id ושם אבן הדרך הם שדות חובה" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("milestones")
    .insert({
      project_id,
      name: name.trim(),
      description: description?.trim() || null,
      target_date: target_date || null,
      status: "pending",
    })
    .select("id, project_id, name, description, target_date, status, created_at")
    .single();

  if (error) {
    console.error("[admin/milestones POST]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ milestone: data }, { status: 201 });
}
