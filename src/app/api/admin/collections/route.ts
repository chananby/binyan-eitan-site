/**
 * /api/admin/collections — the "what do I need to collect right now"
 * surface for the receivables tab + dashboard widget.
 *
 *   GET — every payment_milestones row that is status='due' AND
 *         paid_amount < amount (and deleted_at IS NULL), joined with
 *         project (id, name, status).
 *
 *         Each row carries a derived `remaining = amount - paid_amount`
 *         so the client doesn't repeat the math. Totals roll up:
 *           total_due   — SUM(remaining)
 *           count       — number of rows
 *           by_project  — { [project_id]: remaining-sum }   ready for
 *                         the per-project section sub-totals.
 *
 * Phase 1 doesn't filter on project status — an `inactive` project
 * can still owe a ripened stage; the receivables view tags it
 * visually but surfaces it so it isn't forgotten on the way out.
 *
 * Admin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const MILESTONE_COLUMNS =
  "id, project_id, title, amount, paid_amount, status, sort_order, expected_date, note, marked_due_at, paid_at, created_at, updated_at";

interface RawRow {
  id: string;
  project_id: string;
  title: string;
  amount: number | string | null;
  paid_amount: number | string | null;
  status: string;
  sort_order: number | null;
  expected_date: string | null;
  note: string | null;
  marked_due_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  project: { id: string; name: string; status: string | null } | null;
}

function num(v: number | string | null): number {
  if (v === null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Single query with inline project join. ORDER BY project_id then
  // sort_order so the client can group contiguous chunks without
  // re-sorting. Cannot push the `paid_amount < amount` predicate to the
  // server cheaply via supabase-js's filter chain (no row-pair filter),
  // so we filter that client-side after fetching the small "due" set.
  const { data, error } = await supabase
    .from("payment_milestones")
    .select(`${MILESTONE_COLUMNS}, project:project_id(id, name, status)`)
    .eq("status", "due")
    .is("deleted_at", null)
    .order("project_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[admin/collections GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as RawRow[];

  // Filter to "actually open" (paid_amount < amount), attach derived
  // `remaining`, and build totals in one pass.
  let totalDue = 0;
  const byProject: Record<string, number> = {};
  const items: Array<{
    milestone: Omit<RawRow, "project"> & { remaining: number };
    project: RawRow["project"];
    remaining: number;
  }> = [];

  for (const r of rows) {
    const amount = num(r.amount);
    const paid   = num(r.paid_amount);
    const remaining = amount - paid;
    if (remaining <= 0) continue;        // fully (or over) paid — not collectible

    totalDue += remaining;
    byProject[r.project_id] = (byProject[r.project_id] ?? 0) + remaining;
    const { project, ...milestoneBase } = r;
    items.push({
      milestone: { ...milestoneBase, remaining },
      project,
      remaining,
    });
  }

  return NextResponse.json({
    items,
    totals: {
      total_due: totalDue,
      count: items.length,
      by_project: byProject,
    },
  });
}
