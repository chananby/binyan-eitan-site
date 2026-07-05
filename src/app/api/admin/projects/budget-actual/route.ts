/**
 * GET /api/admin/projects/budget-actual
 *
 * Per-project budget-vs-actual for SITE projects, with proportional
 * overhead allocation on top of direct expenses.
 *
 * Five-step calculation (order matters — see the guard comments):
 *
 *   1. direct[site]   — sum of expenses landing on each site project,
 *                       either directly (project_id) or via splits.
 *                       Includes salary docs assigned to that site;
 *                       excludes anything with include_in_actuals=false.
 *   2. total_direct   — Σ direct[site] across all site projects
 *                       (approved-only; pending doesn't move the base).
 *   3. overhead_pool  — sum of expenses landing on any project whose
 *                       project_type='overhead'. Docs on the overhead
 *                       project don't show up in direct rollups at all.
 *   4. share[site]    — direct[site].approved / total_direct.
 *                       Guarded: if total_direct = 0 → share = 0, pool
 *                       stays un-allocated (see edge case note in code).
 *                       KEY: share is computed on direct-ONLY (before
 *                       step 5) so overhead can't feed itself.
 *   5. full[site]     — direct[site].approved + overhead_pool × share.
 *
 * Loop-safety: step 4 uses `direct[site].approved`, not
 * `direct[site].approved + allocated`. Overhead allocation never
 * appears in its own share basis.
 *
 * Backward compat: the shape returned by computeProjectBudget is
 * preserved. `allocatedOverhead` is added as an extra field on each
 * row; consumers that ignore it see the direct-only numbers they saw
 * before (approvedExpense / pendingExpense unchanged).
 *
 * Admin only.
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

  // Three fetches in parallel. Notes:
  //   • The projects query now filters to site+active, matching the
  //     STEP 1 scope. Overhead projects are used only to identify docs
  //     for the pool (STEP 3) — they never appear as rollup rows.
  //   • include_in_actuals=false docs are dropped everywhere. Same
  //     spot as the deleted_at/linked filter — they're just as invisible
  //     to the rollup as a soft-deleted row.
  const [
    { data: siteProjects, error: pErr },
    { data: overheadProjects, error: opErr },
    { data: docs, error: dErr },
    { data: splits, error: sErr },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, budget, project_type")
      .eq("project_type", "site")
      .eq("status", "active"),
    supabase
      .from("projects")
      .select("id")
      .eq("project_type", "overhead"),
    supabase
      .from("financial_documents")
      .select("id, project_id, direction, status, amount_ils")
      .is("deleted_at", null)
      .is("linked_document_id", null)
      .eq("include_in_actuals", true)
      .eq("direction", "expense")
      .in("status", ["approved", "pending"]),
    supabase
      .from("document_project_splits")
      .select("document_id, project_id, amount")
      .is("deleted_at", null),
  ]);

  const firstErr = pErr ?? opErr ?? dErr ?? sErr;
  if (firstErr) {
    console.error("[admin/projects/budget-actual]", JSON.stringify(firstErr));
    return NextResponse.json({ error: firstErr.message }, { status: 500 });
  }

  const siteIds     = new Set((siteProjects     ?? []).map((p: { id: string }) => p.id));
  const overheadIds = new Set((overheadProjects ?? []).map((p: { id: string }) => p.id));

  // Partition docs by which project they belong to. This is what stops
  // sibling C — an "overhead" category doc on a site project stays with
  // the site (contributes to direct), and any doc on the overhead
  // project feeds the pool regardless of its category. Docs with
  // project_id=null but splits are neither site nor overhead singles;
  // they land on their splits' projects via groupExpensesByProject.
  interface DocRow { id: string; project_id: string | null; direction: string | null; status: string | null; amount_ils: number | null }
  const siteDocs:     DocRow[] = [];
  const overheadDocs: DocRow[] = [];
  const otherDocs:    DocRow[] = []; // no project_id → may have splits
  for (const d of (docs ?? []) as DocRow[]) {
    if (d.project_id == null) { otherDocs.push(d); continue; }
    if (siteIds.has(d.project_id))     { siteDocs.push(d);     continue; }
    if (overheadIds.has(d.project_id)) { overheadDocs.push(d); continue; }
    // Doc references a project we didn't fetch (inactive, deleted, or
    // a project_type we don't handle yet). Drop it — same behavior as
    // the previous version which just ignored these implicitly.
  }

  // ── STEP 1 + STEP 2 — direct expenses per site + total direct ────────
  // groupExpensesByProject fans (docs+splits) into per-project buckets.
  // Feeding it siteDocs plus otherDocs (which have splits) is safe: a
  // split's project must be a real project id, and if that project is
  // an overhead one, we drop it from siteBucket below.
  const byProject = groupExpensesByProject(
    ([...siteDocs, ...otherDocs]) as unknown as SplitDocRaw[],
    (splits ?? []) as unknown as SplitRowRaw[],
  );

  // Compute direct budget rows for site projects only, and total direct.
  const directRows = (siteProjects ?? []).map((proj) => {
    const p = proj as { id: string; name: string; status: string | null; budget: number | null };
    const contribs = byProject.get(p.id) ?? [];
    return {
      project_id: p.id,
      name: p.name,
      status: p.status,
      ...computeProjectBudget(p.budget, contribs),
    };
  });
  const totalDirect = directRows.reduce((s, r) => s + (r.approvedExpense ?? 0), 0);

  // ── STEP 3 — overhead pool ────────────────────────────────────────────
  // Only approved docs on overhead projects feed the pool. Pending
  // overhead docs are left aside — they'll fold in the moment they're
  // approved, at which point the next fetch shows the updated
  // allocation. Same rule the site side uses.
  let overheadPoolApproved = 0;
  let overheadPoolPending  = 0;
  for (const d of overheadDocs) {
    const amt = d.amount_ils ?? 0;
    if (d.status === "approved") overheadPoolApproved += amt;
    else if (d.status === "pending") overheadPoolPending += amt;
  }

  // ── STEP 4 + STEP 5 — proportional allocation per site ───────────────
  // Edge case: totalDirect === 0 means no site has any approved direct
  // expense to base the share on. We can't split "by X" when X=0 — so
  // allocatedOverhead stays 0 across all sites and the pool is
  // effectively unallocated for this month. The response includes
  // overheadPoolApproved separately so a UI can surface the unallocated
  // pool if it wants to.
  const rows = directRows.map((r) => {
    const share = totalDirect > 0 ? (r.approvedExpense / totalDirect) : 0;
    const allocatedOverhead = Math.round(overheadPoolApproved * share);
    return { ...r, allocatedOverhead };
  });

  return NextResponse.json({
    rows,
    overhead: {
      poolApproved: overheadPoolApproved,
      poolPending:  overheadPoolPending,
      totalDirect,
      allocatedAcrossSites: totalDirect > 0 ? overheadPoolApproved : 0,
      unallocated:          totalDirect > 0 ? 0 : overheadPoolApproved,
    },
  });
}
