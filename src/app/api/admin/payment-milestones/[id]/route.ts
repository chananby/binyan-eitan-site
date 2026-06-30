/**
 * /api/admin/payment-milestones/[id] — single-row edit + soft-delete.
 *
 *   PATCH  { title?, amount?, expected_date?, note?, sort_order? }
 *     Field edits that DON'T change status or paid_amount. Any omitted
 *     field stays as it was; an explicit null clears the field where
 *     legal (note, expected_date). amount must stay > 0 if supplied.
 *
 *   DELETE — soft delete: stamps deleted_at = now(). Subsequent GETs
 *     (which filter deleted_at IS NULL) skip the row. Hard delete is
 *     deliberately not exposed.
 *
 * Status changes live in the sibling /transition route (future ↔ due)
 * and payment changes live in /payment (paid_amount → derived 'paid'
 * status). Keeping the three surfaces apart means a row-edit form
 * can't accidentally satisfy a payment.
 *
 * Admin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

const MILESTONE_COLUMNS =
  "id, project_id, title, amount, paid_amount, status, sort_order, expected_date, note, marked_due_at, paid_at, created_at, updated_at";

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isISODate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// ── PATCH — edit fields (no status or payment change) ────────────────────────
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  if (!isNonEmpty(id)) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: {
    title?: unknown; amount?: unknown; expected_date?: unknown;
    note?: unknown; sort_order?: unknown;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const patch: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (!isNonEmpty(body.title)) {
      return NextResponse.json({ error: "title must be non-empty if provided" }, { status: 400 });
    }
    patch.title = body.title.trim();
  }

  if (body.amount !== undefined) {
    const amt = typeof body.amount === "number" ? body.amount : NaN;
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }
    patch.amount = amt;
  }

  if (body.expected_date !== undefined) {
    if (body.expected_date === null || body.expected_date === "") patch.expected_date = null;
    else if (isISODate(body.expected_date)) patch.expected_date = body.expected_date;
    else return NextResponse.json({ error: "expected_date must be YYYY-MM-DD or null" }, { status: 400 });
  }

  if (body.note !== undefined) {
    if (body.note === null) patch.note = null;
    else if (typeof body.note === "string") patch.note = body.note.trim() || null;
    else return NextResponse.json({ error: "note must be a string or null" }, { status: 400 });
  }

  if (body.sort_order !== undefined) {
    const so = typeof body.sort_order === "number" ? body.sort_order : NaN;
    if (!Number.isInteger(so) || so < 0) {
      return NextResponse.json({ error: "sort_order must be a non-negative integer" }, { status: 400 });
    }
    patch.sort_order = so;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payment_milestones")
    .update(patch)
    .eq("id", id.trim())
    .is("deleted_at", null)
    .select(MILESTONE_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[admin/payment-milestones PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "milestone not found" }, { status: 404 });
  }
  return NextResponse.json({ milestone: data });
}

// ── DELETE — soft delete ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  if (!isNonEmpty(id)) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payment_milestones")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.trim())
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/payment-milestones DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "milestone not found or already deleted" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
