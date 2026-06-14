/**
 * GET /api/admin/projects/budget-actual
 *
 * Per-project budget-vs-actual. Budget comes from projects.budget; "actual" is
 * the sum of approved (and, separately, pending) EXPENSE financial_documents
 * for that project. The arithmetic is the shared, unit-tested
 * computeProjectBudget() — this route only fetches + groups. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { computeProjectBudget, type BudgetDoc } from "../../../../../lib/budget-actual";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const [{ data: projects, error: pErr }, { data: docs, error: dErr }] = await Promise.all([
    supabase.from("projects").select("id, name, status, budget"),
    supabase
      .from("financial_documents")
      .select("project_id, direction, status, total_amount")
      .is("deleted_at", null)
      .eq("direction", "expense")
      .in("status", ["approved", "pending"])
      .not("project_id", "is", null),
  ]);

  if (pErr || dErr) {
    console.error("[admin/projects/budget-actual]", JSON.stringify(pErr ?? dErr));
    return NextResponse.json({ error: (pErr ?? dErr)!.message }, { status: 500 });
  }

  // Group expense docs by project.
  const byProject = new Map<string, BudgetDoc[]>();
  for (const d of docs ?? []) {
    const pid = (d as { project_id: string | null }).project_id;
    if (!pid) continue;
    if (!byProject.has(pid)) byProject.set(pid, []);
    byProject.get(pid)!.push(d as BudgetDoc);
  }

  const rows = (projects ?? []).map((proj) => {
    const p = proj as { id: string; name: string; status: string | null; budget: number | null };
    return { project_id: p.id, name: p.name, status: p.status, ...computeProjectBudget(p.budget, byProject.get(p.id) ?? []) };
  });

  return NextResponse.json({ rows });
}
