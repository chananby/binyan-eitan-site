/**
 * /api/admin/payment-milestones/[id]/transition — progress-flag toggle.
 *
 *   POST { to: "future" | "due" }
 *
 *     → due:     marked_due_at = now()   (ripens the stage)
 *     → future:  marked_due_at = NULL    (reverts; e.g. clicked the
 *                                         wrong row)
 *
 * Notice: 'paid' is NOT a transition target. Whether a milestone is
 * paid is derived from paid_amount on the sibling /payment endpoint;
 * letting an admin flip status='paid' here would let the contractor
 * mark "paid" without recording a single shekel arrived, which is the
 * whole point we're trying to prevent.
 *
 * Going future → future or due → due is a soft no-op: we still write
 * through so updated_at refreshes, which keeps "what changed lately"
 * cards honest.
 *
 * Admin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../../lib/admin-auth";
import { isTransitionableStatus } from "../../../../../../lib/payment-milestones";

export const runtime = "nodejs";

const MILESTONE_COLUMNS =
  "id, project_id, title, amount, paid_amount, status, sort_order, expected_date, note, marked_due_at, paid_at, created_at, updated_at";

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  if (!isNonEmpty(id)) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: { to?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!isTransitionableStatus(body.to)) {
    return NextResponse.json(
      { error: "to must be one of: future, due (paid is set via /payment)" },
      { status: 400 },
    );
  }
  const to = body.to;

  const supabase = createServerClient();

  const patch: Record<string, unknown> = {
    status: to,
    marked_due_at: to === "due" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("payment_milestones")
    .update(patch)
    .eq("id", id.trim())
    .is("deleted_at", null)
    .select(MILESTONE_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[admin/payment-milestones transition]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "milestone not found" }, { status: 404 });
  }
  return NextResponse.json({ milestone: data });
}
