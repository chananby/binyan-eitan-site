/**
 * GET /api/admin/finance/pnl — monthly P&L rollup for the dashboard card.
 *
 *   ?months=N   how many calendar months ending with the current one.
 *               Default 6, clamped to [1, 24] so a malicious query
 *               string can't drag a year+ of rows into the function.
 *
 * Returns:
 *   { rows: [{ month: 'YYYY-MM', income, expense, net }, ...],
 *     current: { month, income, expense, net } }
 *
 * Sums financial_documents.amount_ils (the unified shekel value) — never
 * the raw total_amount — so a foreign-currency doc that's missing its
 * shekel field contributes 0 instead of its foreign nominal. Same rule
 * the budget-actual rollup follows.
 *
 * Filters (locked):
 *   • status = 'approved' (pending/rejected don't move the headline).
 *   • deleted_at IS NULL.
 *   • direction IN ('income','expense') — quotes / delivery notes /
 *     direction=none never count, even if a category flag flipped on
 *     them by mistake.
 *   • doc_date >= the first of the oldest month in the window — so we
 *     don't pull years of irrelevant rows into the function.
 *
 * Admin only — same auth gate as the rest of /admin/finance.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { computeMonthlyPnl, type PnlDoc } from "../../../../../lib/finance-pnl";

export const runtime = "nodejs";

const DEFAULT_MONTHS = 6;
const MAX_MONTHS = 24;

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = parseInt(searchParams.get("months") ?? "", 10);
  const months = Number.isFinite(raw) && raw > 0
    ? Math.min(raw, MAX_MONTHS)
    : DEFAULT_MONTHS;

  // Lower bound on doc_date so we don't pull the whole table. First day of
  // the oldest month in the window, in 'YYYY-MM-DD' form.
  const now = new Date();
  const oldest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const since =
    `${oldest.getUTCFullYear()}-${String(oldest.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("financial_documents")
    .select("doc_date, direction, amount_ils, status")
    .is("deleted_at", null)
    .is("linked_document_id", null)  // exclude evidence — primary carries the count
    .eq("status", "approved")
    .in("direction", ["income", "expense"])
    .gte("doc_date", since);

  if (error) {
    console.error("[admin/finance/pnl]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = computeMonthlyPnl((data ?? []) as PnlDoc[], { months, now: now.getTime() });
  return NextResponse.json(result);
}
