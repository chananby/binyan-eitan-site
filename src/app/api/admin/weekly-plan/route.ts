import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isAdminAuthedFromRequest,
  isAuthedFromRequest,
  getRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// GET — list rows for a project, optionally filtered by week range
export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.json({ error: "project_id required" }, { status: 400 });
  }

  // Foreman may only see their own projects
  const role = getRoleFromRequest(req);
  if (role === "foreman") {
    const staffId = getForemanStaffIdFromRequest(req);
    const supabase = createServerClient();
    const { data: proj } = await supabase
      .from("projects")
      .select("foreman_id")
      .eq("id", projectId)
      .maybeSingle();
    if (!proj || proj.foreman_id !== staffId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("weekly_plan")
    .select("*")
    .eq("project_id", projectId)
    .order("week_start", { ascending: true })
    .order("created_at",  { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

// POST — create a new row
export async function POST(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    project_id?: string;
    week_start?: string;
    task_name?: string;
    subcontractor?: string;
    workers_needed?: number;
    materials?: string;
    supplier?: string;
    order_status?: string;
    planned_cost?: number;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { project_id, week_start, task_name } = body;
  if (!project_id || !week_start || !task_name?.trim()) {
    return NextResponse.json({ error: "project_id, week_start, task_name required" }, { status: 400 });
  }

  const VALID_ORDER = ["none", "ordered", "in_transit", "delivered"];
  const order_status = VALID_ORDER.includes(body.order_status ?? "") ? body.order_status : "none";

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("weekly_plan")
    .insert({
      project_id,
      week_start,
      task_name:      task_name.trim(),
      subcontractor:  body.subcontractor  ?? null,
      workers_needed: body.workers_needed ?? 0,
      materials:      body.materials      ?? null,
      supplier:       body.supplier       ?? null,
      order_status,
      planned_cost:   body.planned_cost   ?? 0,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ row: data }, { status: 201 });
}
