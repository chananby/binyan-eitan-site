import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isAuthedFromRequest,
  getRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");

  // No project_id supplied → return empty (health checks and callers without context land here)
  if (!projectId) {
    return NextResponse.json({ rows: [] });
  }

  try {
    const supabase = createServerClient();

    // Foreman: verify they are assigned to this project
    if (getRoleFromRequest(req) === "foreman") {
      const staffId = getForemanStaffIdFromRequest(req);
      const { data: proj, error: projErr } = await supabase
        .from("projects")
        .select("foreman_id")
        .eq("id", projectId)
        .maybeSingle();

      if (projErr) {
        console.error("[admin/weekly-plan GET] project lookup error:", projErr);
        return NextResponse.json({ error: projErr.message }, { status: 500 });
      }
      if (!proj || proj.foreman_id !== staffId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("weekly_plan")
      .select("*")
      .eq("project_id", projectId)
      .order("week_start", { ascending: true })
      .order("created_at",  { ascending: true });

    if (error) {
      console.error("[admin/weekly-plan GET] supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rows: data ?? [] });
  } catch (err) {
    console.error("[admin/weekly-plan GET] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

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

  try {
    body = await req.json();
  } catch (err) {
    console.error("[admin/weekly-plan POST] invalid JSON:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { project_id, week_start, task_name } = body;
  if (!project_id || !week_start || !task_name?.trim()) {
    return NextResponse.json({ error: "project_id, week_start, task_name required" }, { status: 400 });
  }

  const VALID_ORDER  = ["none", "ordered", "in_transit", "delivered"];
  const order_status = VALID_ORDER.includes(body.order_status ?? "") ? body.order_status : "none";

  try {
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

    if (error) {
      console.error("[admin/weekly-plan POST] supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ row: data }, { status: 201 });
  } catch (err) {
    console.error("[admin/weekly-plan POST] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
