/**
 * /api/admin/documents/[id]
 *   PATCH  — update metadata fields only (whitelisted). When status flips to
 *            approved/rejected we stamp reviewed_at=now() and reviewed_by
 *            from the admin token. storage_path, extraction_raw and
 *            uploaded_by are never writable here.
 *   DELETE — soft delete only: set deleted_at=now(). The bucket object is
 *            left in place (recoverable; reaped separately if ever needed).
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import {
  isAdminAuthedFromRequest,
  getAdminIdFromRequest,
} from "../../../../../lib/admin-auth";
import { DOCUMENT_COLUMNS } from "../../../../../lib/document-columns";
import { resolveAmountIls } from "../../../../../lib/document-classify";

export const runtime = "nodejs";

// Metadata fields an admin may edit. Deliberately excludes storage_path,
// extraction_raw, uploaded_by (and the server-managed reviewed_* / deleted_at).
const EDITABLE_FIELDS = [
  "doc_type",
  "direction",
  "vendor_id",
  "doc_number",
  "doc_date",
  "amount_before_vat",
  "vat_amount",
  "total_amount",
  "currency",
  "amount_ils",
  "category",
  "project_id",
  "description",
  "notes",
  "status",
  "possible_duplicate_of",  // settable to null to clear a "not a duplicate" flag
  "linked_document_id",     // invoice ↔ payment cross-reference; null = primary, uuid = evidence
] as const;

const RETURN_COLUMNS = DOCUMENT_COLUMNS;

// ── GET — one document (for the review screen) ──────────────────────────────
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("financial_documents")
    .select(RETURN_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("[admin/documents GET one]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
  return NextResponse.json({ document: data });
}

// ── PATCH — update metadata ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const update: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  // Guard the "single OR split, never both" invariant. If the caller is
  // trying to set a non-null project_id, refuse when this doc already has
  // live splits — that would double-count the money in every rollup that
  // sums both sources. To assign a single project the admin must clear
  // splits first (DELETE /splits) or reassign via POST /splits with the
  // single row they want.
  if ("project_id" in update && update.project_id != null) {
    const supabase = createServerClient();
    const { data: liveSplits } = await supabase
      .from("document_project_splits")
      .select("id")
      .eq("document_id", id)
      .is("deleted_at", null)
      .limit(1);
    if (liveSplits && liveSplits.length > 0) {
      return NextResponse.json(
        { error: "מסמך זה מפוצל בין כמה פרויקטים. בטל את הפיצול לפני שיוך לפרויקט יחיד." },
        { status: 409 },
      );
    }
  }

  // Keep amount_ils authoritative on a full amount save: an ILS doc always
  // mirrors total_amount; a foreign doc keeps the admin-entered shekel value.
  // Partial PATCHes (status flip, clear-flag) don't carry currency+total, so
  // amount_ils is left untouched there.
  if ("currency" in update && "total_amount" in update) {
    update.amount_ils = resolveAmountIls(
      update.currency as string | null,
      update.total_amount as number | null,
      ("amount_ils" in update ? update.amount_ils : null) as number | null,
    );
  }

  // A review decision stamps who/when. reviewed_by comes from the token, not
  // the request body, so it can't be spoofed. Reverting to pending (Undo)
  // clears the stamp so the row reads as truly un-reviewed again.
  if (update.status === "approved" || update.status === "rejected") {
    update.reviewed_at = new Date().toISOString();
    update.reviewed_by = getAdminIdFromRequest(req);
  } else if (update.status === "pending") {
    update.reviewed_at = null;
    update.reviewed_by = null;
  }

  const supabase = createServerClient();
  const { data: row, error } = await supabase
    .from("financial_documents")
    .update(update)
    .eq("id", id)
    .is("deleted_at", null)
    .select(RETURN_COLUMNS)
    .single();

  if (error) {
    // PGRST116 = no row matched (already deleted or bad id).
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
    }
    console.error("[admin/documents PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: row });
}

// ── DELETE — soft delete ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;

  const supabase = createServerClient();
  const { data: row, error } = await supabase
    .from("financial_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
    }
    console.error("[admin/documents DELETE]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id });
}
