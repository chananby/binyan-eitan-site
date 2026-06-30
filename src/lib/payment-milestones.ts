// Pure helpers for payment_milestones — phase 1 of the financial-
// management work. Per-project payment stages with partial-payment
// support: `amount` is the planned figure (including VAT), `paid_amount`
// is the actual cumulative cash that's come in, and `status`
// (future/due/paid) carries the contractor's manual progress flag.
//
// "Fully paid" = paid_amount >= amount. "Partially paid" =
// 0 < paid_amount < amount. "Open for collection" = status='due' and
// paid_amount < amount. The four totals below are the load-bearing
// rollup for the receivables tab + dashboard widget.
//
// Pure JS. No DB, no I/O. Routes fetch + soft-delete-filter, then call
// computeMilestoneTotals().

/** One row of payment_milestones, narrowed to the fields the totals
 *  aggregation needs. The routes select a wider set; this type stays
 *  minimal so the helper isn't tied to columns the schema might evolve
 *  beyond these four. */
export interface MilestoneForTotals {
  status: string | null;
  amount: number | string | null;
  paid_amount: number | string | null;
  deleted_at?: string | null;
}

/** The four numbers the receivables UI needs in a single pass:
 *
 *   planned     — SUM(amount) over every live row. The headline "deal
 *                 size" across all stages.
 *   collected   — SUM(paid_amount). What's actually arrived, regardless
 *                 of which status carries it.
 *   due         — SUM(remaining) over rows whose status='due' AND
 *                 paid_amount < amount. The "what to chase right now"
 *                 figure.
 *   outstanding — SUM(remaining) over EVERY row that isn't fully paid.
 *                 Includes future stages (not yet ripened) plus
 *                 unpaid-due plus partially-paid. The full "still
 *                 owed to me" figure across the deal's lifetime. */
export interface MilestoneTotals {
  planned: number;
  collected: number;
  due: number;
  outstanding: number;
}

/** Coerce a numeric field that Supabase may return as string. NaN /
 *  null become 0 so a single bad row can't corrupt a rollup. */
function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export function computeMilestoneTotals(
  rows: ReadonlyArray<MilestoneForTotals>,
): MilestoneTotals {
  const totals: MilestoneTotals = { planned: 0, collected: 0, due: 0, outstanding: 0 };
  for (const r of rows) {
    if (r.deleted_at) continue;
    const amount = num(r.amount);
    const paid   = num(r.paid_amount);
    const remaining = Math.max(0, amount - paid);

    totals.planned += amount;
    totals.collected += paid;

    if (remaining > 0) {
      totals.outstanding += remaining;
      // "due" is the subset of outstanding that the admin has flagged
      // as ripened (status='due') — what to chase right now, not the
      // longer-tail forecast that `outstanding` carries.
      if (r.status === "due") totals.due += remaining;
    }
  }
  return totals;
}

/** The three legal statuses, in lifecycle order. The DB CHECK enforces
 *  this same set — keep them in sync. status='paid' is derived from
 *  paid_amount on the /payment endpoint; transitions only move
 *  future ↔ due. */
export const MILESTONE_STATUSES = ["future", "due", "paid"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

/** Status values legal to *transition to* via the /transition endpoint.
 *  Excludes 'paid' on purpose — 'paid' is the consequence of fully
 *  satisfying paid_amount, not a flag an admin sets directly. */
export const TRANSITIONABLE_STATUSES = ["future", "due"] as const;
export type TransitionableStatus = (typeof TRANSITIONABLE_STATUSES)[number];

export function isTransitionableStatus(s: unknown): s is TransitionableStatus {
  return s === "future" || s === "due";
}
