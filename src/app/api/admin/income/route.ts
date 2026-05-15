import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const limit  = Math.min(parseInt(searchParams.get("limit")  || "500", 10), 2000);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0",   10), 0);

  const supabase = createServerClient();

  // List query (paginated)
  let listQuery = supabase
    .from("income")
    .select("id, project_id, amount, description, received_date, created_at, project:project_id(id, name)")
    .order("received_date", { ascending: false })
    .range(offset, offset + limit - 1);
  if (projectId) listQuery = listQuery.eq("project_id", projectId);

  // Totals query (separate — must aggregate ALL rows, not just the page).
  // Cheap: just amount + project_id, no joins.
  let totalsQuery = supabase
    .from("income")
    .select("project_id, amount");
  if (projectId) totalsQuery = totalsQuery.eq("project_id", projectId);

  const [{ data, error }, { data: allRows, error: totalsErr }] = await Promise.all([
    listQuery,
    totalsQuery,
  ]);

  if (error) {
    console.error("[admin/income GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (totalsErr) {
    console.error("[admin/income GET totals]", JSON.stringify(totalsErr));
    return NextResponse.json({ error: totalsErr.message }, { status: 500 });
  }

  // Totals per project for profitability view — computed from ALL rows
  // so pagination doesn't distort the project total.
  const totals: Record<string, number> = {};
  for (const r of allRows ?? []) {
    totals[r.project_id] = (totals[r.project_id] ?? 0) + (r.amount ?? 0);
  }

  return NextResponse.json({ income: data ?? [], totals });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { project_id?: string; amount?: number; description?: string; received_date?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { project_id, amount, description, received_date } = body;
  if (!project_id || !amount || amount <= 0) {
    return NextResponse.json({ error: "project_id ו-amount הם שדות חובה" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("income")
    .insert({
      project_id,
      amount,
      description: description?.trim() || null,
      received_date: received_date || new Date().toISOString().slice(0, 10),
    })
    .select("id, project_id, amount, description, received_date, created_at")
    .single();

  if (error) {
    console.error("[admin/income POST]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ record: data }, { status: 201 });
}
