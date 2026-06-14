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
  "category",
  "project_id",
  "description",
  "notes",
  "status",
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

  // A review decision stamps who/when. reviewed_by comes from the token, not
  // the request body, so it can't be spoofed.
  if (typeof update.status === "string" && (update.status === "approved" || update.status === "rejected")) {
    update.reviewed_at = new Date().toISOString();
    update.reviewed_by = getAdminIdFromRequest(req);
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
