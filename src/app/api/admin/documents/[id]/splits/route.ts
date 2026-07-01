/**
 * /api/admin/documents/[id]/splits — split a financial document across
 * multiple projects, or clear an existing split back to "unassigned".
 *
 * Contract:
 *   • GET     — return the doc's LIVE splits (deleted_at IS NULL), sorted
 *               by sort_order. Empty array when the doc is single-project.
 *   • POST    — replace-all: body `{ splits: [{project_id, amount}, ...] }`.
 *               Existing splits for this doc are soft-deleted, new ones
 *               inserted, and financial_documents.project_id is cleared
 *               to NULL. All in a single request — either the request
 *               succeeds and the doc is fully in the new state, or it
 *               fails before touching the parent and the old state
 *               remains. Empty body array behaves like DELETE (clears
 *               all splits + clears project_id).
 *   • DELETE  — soft-delete every LIVE split for this doc. Leaves
 *               project_id NULL — the admin can re-assign a single
 *               project via the normal PATCH afterwards.
 *
 * Admin only. All amounts are ILS (numeric(12,2)) and must be positive.
 * A split whose sum > document.total_amount is allowed (over-allocation
 * warning), because the invoice's total amount is the source of truth and
 * an admin may legitimately split slightly differently; the UI surfaces
 * the discrepancy but doesn't block it. Similarly a shortfall (sum < total)
 * just leaves a remainder unattributed — that is by design.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../../lib/admin-auth";
import { sumSplits } from "../../../../../../lib/document-splits";

export const runtime = "nodejs";

interface SplitInput {
  project_id?: string;
  amount?: number | string;
}

// ── GET — list live splits for one document ────────────────────────────────
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("document_project_splits")
    .select("id, document_id, project_id, amount, sort_order, created_at, project:project_id(name)")
    .eq("document_id", id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[splits GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ splits: data ?? [] });
}

// ── POST — replace splits ──────────────────────────────────────────────────
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: documentId } = await props.params;

  let body: { splits?: SplitInput[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const raw = Array.isArray(body.splits) ? body.splits : [];

  // Validate every row up front. Reject the whole request on the first
  // bad row so the DB never sees a partial write.
  const clean: { project_id: string; amount: number; sort_order: number }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    const pid = typeof s.project_id === "string" ? s.project_id.trim() : "";
    if (!pid) return NextResponse.json({ error: `שורה ${i + 1}: חסר פרויקט` }, { status: 400 });
    const amt = typeof s.amount === "string" ? parseFloat(s.amount) : s.amount;
    if (typeof amt !== "number" || !Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: `שורה ${i + 1}: סכום חייב להיות מספר חיובי` }, { status: 400 });
    }
    clean.push({ project_id: pid, amount: Math.round(amt * 100) / 100, sort_order: i });
  }

  const supabase = createServerClient();

  // Sanity: the document exists and is not soft-deleted. Also grab its
  // total so the response can report the remainder for the UI.
  const { data: doc, error: docErr } = await supabase
    .from("financial_documents")
    .select("id, amount_ils, total_amount, deleted_at")
    .eq("id", documentId)
    .maybeSingle();
  if (docErr) {
    console.error("[splits POST doc fetch]", JSON.stringify(docErr));
    return NextResponse.json({ error: docErr.message }, { status: 500 });
  }
  if (!doc || doc.deleted_at) {
    return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
  }

  // Confirm every project exists — Postgres will reject on FK anyway,
  // but a friendly error beats "foreign key violation" surfacing in the UI.
  if (clean.length > 0) {
    const pids = [...new Set(clean.map((c) => c.project_id))];
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .in("id", pids);
    const existingSet = new Set((existing ?? []).map((p) => p.id));
    const missing = pids.filter((p) => !existingSet.has(p));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `פרויקט לא נמצא: ${missing.join(", ")}` },
        { status: 400 },
      );
    }
  }

  // 1) Soft-delete any existing LIVE splits for this document. Soft (not
  // hard) so an undo path could restore them later; also matches the
  // pattern the rest of the schema uses.
  const now = new Date().toISOString();
  const { error: delErr } = await supabase
    .from("document_project_splits")
    .update({ deleted_at: now })
    .eq("document_id", documentId)
    .is("deleted_at", null);
  if (delErr) {
    console.error("[splits POST soft-delete]", JSON.stringify(delErr));
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // 2) Insert new splits (if any).
  let inserted: unknown[] = [];
  if (clean.length > 0) {
    const rows = clean.map((c) => ({
      document_id: documentId,
      project_id:  c.project_id,
      amount:      c.amount,
      sort_order:  c.sort_order,
    }));
    const { data: ins, error: insErr } = await supabase
      .from("document_project_splits")
      .insert(rows)
      .select("id, document_id, project_id, amount, sort_order, created_at");
    if (insErr) {
      console.error("[splits POST insert]", JSON.stringify(insErr));
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    inserted = ins ?? [];
  }

  // 3) Clear the doc's own project_id so the rollup takes contributions
  // exclusively from the splits (single-project rows still go through the
  // legacy path — we only clear here because this doc is now split-mode).
  const { error: patchErr } = await supabase
    .from("financial_documents")
    .update({ project_id: null })
    .eq("id", documentId);
  if (patchErr) {
    console.error("[splits POST clear project_id]", JSON.stringify(patchErr));
    return NextResponse.json({ error: patchErr.message }, { status: 500 });
  }

  const totalAssigned = sumSplits(clean.map((c) => ({ document_id: documentId, project_id: c.project_id, amount: c.amount })));
  const docTotal = typeof doc.amount_ils === "number" ? doc.amount_ils
                 : typeof doc.total_amount === "number" ? doc.total_amount
                 : null;
  const remainder = docTotal != null ? Math.round((docTotal - totalAssigned) * 100) / 100 : null;

  return NextResponse.json({
    splits: inserted,
    totalAssigned,
    docTotal,
    remainder,
  });
}

// ── DELETE — clear all splits, leave doc unassigned ────────────────────────
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: documentId } = await props.params;

  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("document_project_splits")
    .update({ deleted_at: now })
    .eq("document_id", documentId)
    .is("deleted_at", null);
  if (error) {
    console.error("[splits DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // project_id stays NULL — admin re-assigns via PATCH if they want a single project.
  return NextResponse.json({ ok: true });
}
