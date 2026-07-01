// Fold split-document rows and single-project rows into a single per-project
// list of expense contributions — the shape the existing computeProjectBudget
// helper (lib/budget-actual.ts) already understands.
//
// The contract is:
//   • A document with a project_id set contributes its own amount_ils to
//     that project once.
//   • A document with splits contributes each split.amount to the split's
//     project. The parent's direction + status flow through (a pending
//     invoice's splits are pending; an approved invoice's splits are
//     approved) so budget-actual's approved/pending buckets stay honest.
//   • The invariant "a doc is either single OR split, never both" is
//     enforced at write time (POST /splits clears project_id; PATCH
//     document rejects setting project_id when splits exist). The
//     `docsWithSplits` guard here is defensive — if a direct SQL write
//     ever violates the invariant, the split rows still win and the
//     document's own project_id is dropped from the sum, so a project
//     never counts the same money twice.
//
// Pure functions, no DB / no I/O — the route fetches both slices then
// passes them in. Same shape as budget-actual's split into route + helper.

import type { BudgetDoc } from "./budget-actual";

export interface SplitDocRaw {
  id: string;
  project_id: string | null;
  direction: string | null;
  status: string | null;
  amount_ils: number | null;
}

export interface SplitRowRaw {
  document_id: string;
  project_id: string;
  amount: number | string | null;
}

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Bucket expense contributions by project. Feeds directly into
 * computeProjectBudget(budget, byProject.get(projectId) ?? []).
 *
 * The caller is responsible for pre-filtering docs (direction, status,
 * deleted_at, project_type) — this helper just fans the two sources into
 * one Map without applying business filters.
 */
export function groupExpensesByProject(
  docs: ReadonlyArray<SplitDocRaw>,
  splits: ReadonlyArray<SplitRowRaw>,
): Map<string, BudgetDoc[]> {
  const byProject = new Map<string, BudgetDoc[]>();
  const push = (pid: string, entry: BudgetDoc) => {
    const arr = byProject.get(pid);
    if (arr) arr.push(entry);
    else byProject.set(pid, [entry]);
  };

  // Index the doc list once so each split row can look its parent up in O(1)
  // to pull direction + status. A split whose parent doc isn't in the input
  // slice (usually because it was filtered out — deleted, rejected, etc.)
  // contributes nothing.
  const docsById = new Map(docs.map((d) => [d.id, d]));

  // Splits first — a doc with splits will feed the projects listed here
  // and NOT via its own project_id, thanks to the guard on the singles pass.
  const docsWithSplits = new Set<string>();
  for (const s of splits) {
    const parent = docsById.get(s.document_id);
    if (!parent) continue; // parent filtered out (deleted, rejected, …)
    docsWithSplits.add(s.document_id);
    push(s.project_id, {
      direction: parent.direction,
      status: parent.status,
      amount_ils: toNum(s.amount),
    });
  }

  // Singles — every doc with a project_id that isn't in the split set.
  // The invariant makes this an OR, not an AND: a valid split doc always
  // has project_id=null, so the second check is defensive belt-and-braces.
  for (const d of docs) {
    if (!d.project_id) continue;
    if (docsWithSplits.has(d.id)) continue;
    push(d.project_id, {
      direction: d.direction,
      status: d.status,
      amount_ils: d.amount_ils,
    });
  }

  return byProject;
}

/**
 * Sum of split amounts on a single document. Used by the /splits POST
 * response so the UI can show a live "assigned / total / remainder" line.
 */
export function sumSplits(splits: ReadonlyArray<SplitRowRaw>): number {
  let total = 0;
  for (const s of splits) total += toNum(s.amount);
  // Round to 2 decimals so display never surfaces floating-point drift.
  return Math.round(total * 100) / 100;
}
