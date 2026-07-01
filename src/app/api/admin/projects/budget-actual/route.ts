/**
 * GET /api/admin/projects/budget-actual
 *
 * Per-project budget-vs-actual. Budget comes from projects.budget; "actual" is
 * the sum of approved (and, separately, pending) EXPENSE contributions on the
 * project — either straight from financial_documents.project_id (single-project
 * docs) or from document_project_splits rows (multi-project docs). The
 * arithmetic still runs through computeProjectBudget(); the split-vs-single
 * fanning is delegated to groupExpensesByProject() so this route stays a
 * plain fetch + merge. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { computeProjectBudget } from "../../../../../lib/budget-actual";
import {
  groupExpensesByProject, type SplitDocRaw, type SplitRowRaw,
} from "../../../../../lib/document-splits";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Three fetches in parallel:
  //   1) projects — the target set for the rollup.
  //   2) expense docs (approved + pending, not deleted). We fetch ALL of
  //      them regardless of whether they have a project_id — split docs
  //      have project_id NULL but their splits still contribute, and
  //      groupExpensesByProject needs the parent row to inherit
  //      direction + status onto each split.
  //   3) splits — every live row. Each split will inherit its parent
  //      doc's direction + status; splits whose parent doc is NOT in the
  //      docs slice (rejected / deleted) are silently dropped by the
  //      helper.
  const [
    { data: projects, error: pErr },
    { data: docs,     error: dErr },
    { data: splits,   error: sErr },
  ] = await Promise.all([
    supabase.from("projects").select("id, name, status, budget"),
    supabase
      .from("financial_documents")
      .select("id, project_id, direction, status, amount_ils")
      .is("deleted_at", null)
      .eq("direction", "expense")
      .in("status", ["approved", "pending"]),
    supabase
      .from("document_project_splits")
      .select("document_id, project_id, amount")
      .is("deleted_at", null),
  ]);

  const firstErr = pErr ?? dErr ?? sErr;
  if (firstErr) {
    console.error("[admin/projects/budget-actual]", JSON.stringify(firstErr));
    return NextResponse.json({ error: firstErr.message }, { status: 500 });
  }

  const byProject = groupExpensesByProject(
    (docs   ?? []) as unknown as SplitDocRaw[],
    (splits ?? []) as unknown as SplitRowRaw[],
  );

  const rows = (projects ?? []).map((proj) => {
    const p = proj as { id: string; name: string; status: string | null; budget: number | null };
    return {
      project_id: p.id,
      name: p.name,
      status: p.status,
      ...computeProjectBudget(p.budget, byProject.get(p.id) ?? []),
    };
  });

  return NextResponse.json({ rows });
}
