/**
 * /api/admin/payment-milestones/[id]/payment — record paid cash.
 *
 *   POST { paid_amount }
 *
 *     paid_amount is the CUMULATIVE total received against this stage,
 *     NOT a delta. A second ₪5,000 deposit on top of an existing
 *     ₪10,000 is sent as paid_amount=15000, not paid_amount=5000.
 *     Cumulative totals match how a contractor reads the deal ledger
 *     ("we've gotten X so far"), and they let an admin correct a typo
 *     by sending the new running total instead of an offsetting delta.
 *
 *   Derivation rules (status is the consequence of paid_amount,
 *   not the other way around):
 *
 *     paid_amount = 0           → paid_at = NULL, status reverts to 'due'
 *                                 if it was 'paid'; otherwise unchanged
 *                                 (a typed-in zero on a 'future' stays
 *                                 'future').
 *     0 < paid_amount < amount  → partial; paid_at = NULL, status = 'due'
 *                                 (a partial payment ALWAYS implies the
 *                                 stage is ripe — money has arrived, the
 *                                 contractor is in active collection).
 *                                 marked_due_at stamped if not set.
 *     paid_amount >= amount     → full; status = 'paid', paid_at = now()
 *                                 (always re-stamps so the latest cash
 *                                 event carries the closing date).
 *
 * Admin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../../lib/admin-auth";

export const runtime = "nodejs";

const MILESTONE_COLUMNS =
  "id, project_id, title, amount, paid_amount, status, sort_order, expected_date, note, marked_due_at, paid_at, created_at, updated_at";

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function numOrNaN(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  if (!isNonEmpty(id)) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: { paid_amount?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const paid = numOrNaN(body.paid_amount);
  if (!Number.isFinite(paid) || paid < 0) {
    return NextResponse.json(
      { error: "paid_amount must be a non-negative number (cumulative total)" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Read amount + current state so we can derive status / paid_at /
  // marked_due_at consistently. amount comes back as a string (Supabase
  // numeric) — coerce here.
  const { data: current, error: readErr } = await supabase
    .from("payment_milestones")
    .select("id, amount, status, marked_due_at")
    .eq("id", id.trim())
    .is("deleted_at", null)
    .maybeSingle();
  if (readErr) {
    console.error("[admin/payment-milestones payment — read]", JSON.stringify(readErr));
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "milestone not found" }, { status: 404 });
  }
  const amount = typeof current.amount === "string" ? parseFloat(current.amount) : (current.amount ?? 0);

  // Derive status, paid_at, marked_due_at from (paid, amount, current).
  // The patch always rewrites paid_amount + paid_at; status flips only
  // when the new amount crosses a boundary.
  const patch: Record<string, unknown> = { paid_amount: paid };
  const now = new Date().toISOString();

  if (paid >= amount && amount > 0) {
    patch.status  = "paid";
    patch.paid_at = now;
    // Backfill marked_due_at if the admin jumped straight to full payment.
    if (!current.marked_due_at) patch.marked_due_at = now;
  } else if (paid > 0) {
    // Partial payment → always 'due'. Money has arrived; the stage is
    // by definition ripe whatever the contractor previously flagged.
    patch.status  = "due";
    patch.paid_at = null;
    if (!current.marked_due_at) patch.marked_due_at = now;
  } else {
    // paid === 0 → clear paid_at. Status reverts from 'paid' to 'due'
    // (because money WAS owed and was un-recorded — chase resumes);
    // 'future' / 'due' stay as they were.
    patch.paid_at = null;
    if (current.status === "paid") patch.status = "due";
  }

  const { data, error } = await supabase
    .from("payment_milestones")
    .update(patch)
    .eq("id", id.trim())
    .is("deleted_at", null)
    .select(MILESTONE_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[admin/payment-milestones payment — update]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "milestone disappeared mid-update" }, { status: 409 });
  }
  return NextResponse.json({ milestone: data });
}
