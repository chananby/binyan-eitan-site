/**
 * /api/admin/documents — financial-inbox documents
 *   POST — upload a new financial document (multipart/form-data: "file").
 *          Writes the bytes to the private Supabase Storage bucket
 *          `financial-documents` under `inbox/<random-uuid>.<ext>` and
 *          inserts a metadata row into financial_documents with
 *          extraction_status='pending', status='pending'.
 *   GET  — list documents with optional filters (status, doc_type,
 *          direction, vendor_id, project_id, date_from/date_to on doc_date,
 *          q on vendor_name_raw/doc_number/description). deleted_at IS NULL
 *          always. The bucket path is NOT exposed.
 *
 * Admin only. The bucket is private; download flows through
 * /api/admin/documents/[id]/file as a server-proxy stream — pattern copied
 * 1:1 from /api/admin/staff/[id]/documents.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isAdminAuthedFromRequest,
  getAdminIdFromRequest,
} from "../../../../lib/admin-auth";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const BUCKET = "financial-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
// Same whitelist as staff-documents: PDF (invoices, receipts) + the common
// image formats a phone camera produces.
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const EXT_FROM_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg":      "jpg",
  "image/jpg":       "jpg",
  "image/png":       "png",
  "image/webp":      "webp",
  "image/heic":      "heic",
  "image/heif":      "heif",
};

// List columns. storage_path is intentionally OMITTED (same as the staff-
// documents list) — clients reach bytes only via the /file proxy by id.
const LIST_COLUMNS =
  "id, original_filename, mime_type, file_size, status, extraction_status, " +
  "doc_type, direction, vendor_id, vendor_name_raw, doc_number, doc_date, " +
  "amount_before_vat, vat_amount, total_amount, currency, category, " +
  "project_id, description, notes, reviewed_at, reviewed_by, uploaded_by, " +
  "created_at, vendor:vendor_id(name), project:project_id(name)";

async function resolveAdminLabel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  adminId: string | null,
): Promise<string> {
  if (!adminId) return "admin:unknown";
  try {
    const { data } = await supabase.from("admins").select("name").eq("id", adminId).maybeSingle();
    return data?.name ? `admin:${data.name}` : `admin:${adminId.slice(0, 8)}`;
  } catch {
    return `admin:${adminId.slice(0, 8)}`;
  }
}

// ── GET — list financial documents ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status     = searchParams.get("status")?.trim()     || null;
  const docType    = searchParams.get("doc_type")?.trim()   || null;
  const direction  = searchParams.get("direction")?.trim()  || null;
  const vendorId   = searchParams.get("vendor_id")?.trim()  || null;
  const projectId  = searchParams.get("project_id")?.trim() || null;
  const dateFrom   = searchParams.get("date_from")?.trim()  || null;
  const dateTo     = searchParams.get("date_to")?.trim()    || null;
  const q          = searchParams.get("q")?.trim()          || null;
  const limit      = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
  const offset     = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const supabase = createServerClient();
  let query = supabase
    .from("financial_documents")
    .select(LIST_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status)    query = query.eq("status", status);
  if (docType)   query = query.eq("doc_type", docType);
  if (direction) query = query.eq("direction", direction);
  if (vendorId)  query = query.eq("vendor_id", vendorId);
  if (projectId) query = query.eq("project_id", projectId);
  if (dateFrom)  query = query.gte("doc_date", dateFrom);
  if (dateTo)    query = query.lte("doc_date", dateTo);
  if (q) {
    const pat = `%${q}%`;
    query = query.or(
      `vendor_name_raw.ilike.${pat},doc_number.ilike.${pat},description.ilike.${pat}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/documents GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ documents: data ?? [] });
}

// ── POST — upload one financial document ────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `קובץ גדול מדי (מקסימום ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 400 },
    );
  }
  const declaredType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(declaredType)) {
    return NextResponse.json(
      { error: "סוג קובץ לא מותר (PDF / JPG / PNG / WEBP / HEIC בלבד)" },
      { status: 400 },
    );
  }
  const originalFilename = file.name.slice(0, 200);

  const supabase = createServerClient();

  // Path: inbox/<random-uuid>.<ext>. Extension is derived from the declared
  // MIME (not the user filename) — prevents extension spoofing.
  const ext  = EXT_FROM_MIME[declaredType] ?? "bin";
  const path = `inbox/${randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: declaredType,
      upsert: false,
    });

  if (uploadErr) {
    console.error("[admin/documents POST] storage error:", uploadErr);
    const msg = uploadErr.message.includes("Bucket not found")
      ? "דלי אחסון 'financial-documents' לא קיים — צור אותו ב-Supabase Storage עם Public=OFF"
      : uploadErr.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const adminId = getAdminIdFromRequest(req);
  const uploaded_by = await resolveAdminLabel(supabase, adminId);

  const { data: row, error: insertErr } = await supabase
    .from("financial_documents")
    .insert({
      storage_path:      path,
      original_filename: originalFilename,
      mime_type:         declaredType,
      file_size:         file.size,
      uploaded_by,
      extraction_status: "pending",
      status:            "pending",
    })
    .select(LIST_COLUMNS)
    .single();

  if (insertErr) {
    // Roll the bucket write back so we never have an orphan object.
    console.error("[admin/documents POST] DB insert failed, rolling back upload:", insertErr);
    try { await supabase.storage.from(BUCKET).remove([path]); } catch { /* best effort */ }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ document: row }, { status: 201 });
}
