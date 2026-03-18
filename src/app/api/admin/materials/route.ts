import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// GET — list materials, optionally by project_id
// ?project_id=xxx
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");

  const supabase = createServerClient();
  let query = supabase
    .from("materials")
    .select("id, project_id, daily_report_id, material_name, quantity, unit, supplier, cost, created_at, project:project_id(id, name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build budget summary: total cost per project
  const budgetMap: Record<string, { project_name: string; total: number }> = {};
  for (const row of data ?? []) {
    const pid = row.project_id as string;
    const proj = row.project as { id: string; name: string } | null;
    if (!budgetMap[pid]) budgetMap[pid] = { project_name: proj?.name ?? pid, total: 0 };
    budgetMap[pid].total += (row.cost as number) ?? 0;
  }
  const budget = Object.entries(budgetMap).map(([project_id, v]) => ({ project_id, ...v }));

  return NextResponse.json({ materials: data ?? [], budget });
}

// POST — log a material
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    project_id?: string;
    daily_report_id?: string;
    material_name?: string;
    quantity?: number;
    unit?: string;
    supplier?: string;
    cost?: number;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { project_id, daily_report_id, material_name, quantity, unit, supplier, cost } = body;
  if (!project_id || !material_name?.trim()) {
    return NextResponse.json({ error: "project_id ושם חומר הם שדות חובה" }, { status: 400 });
  }

  const VALID_UNITS = ["קוב", 'מ"ר', 'מ"א', "יחידות", "טון", "ק\"ג", "ליטר"];
  if (unit && !VALID_UNITS.includes(unit)) {
    return NextResponse.json({ error: "יחידה לא תקינה" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("materials")
    .insert({
      project_id,
      daily_report_id: daily_report_id || null,
      material_name: material_name.trim(),
      quantity: quantity ?? 1,
      unit: unit ?? "יחידות",
      supplier: supplier?.trim() || null,
      cost: cost ?? null,
    })
    .select("id, project_id, material_name, quantity, unit, supplier, cost, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ material: data }, { status: 201 });
}
