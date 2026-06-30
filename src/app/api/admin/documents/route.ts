/**
 * /api/admin/documents — financial-inbox documents
 *   POST — upload a new financial document (multipart/form-data: "file").
 *          Writes the bytes to the private Supabase Storage bucket
 *          `financial-documents` under `inbox/<random-uuid>.<ext>` and
 *          inserts a metadata row into financial_documents with
 *          extraction_status='pending', status='pending'.
 *   GET  — list documents with optional filters (status, doc_type,
 *          direction, category, vendor_id, project_id, date_from/date_to on doc_date,
 *          q on vendor_name_raw/doc_number/description, duplicates_only=true →
 *          only rows with possible_duplicate_of set). deleted_at IS NULL
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
import { DOCUMENT_COLUMNS } from "../../../../lib/document-columns";
import { applyDocContentFilters, readDocContentFilters } from "../../../../lib/document-filters";
import { sha256Hex } from "../../../../lib/file-hash";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
// Upload now does storage write + DB insert only (extraction is decoupled —
// see the POST handler), so it's quick. Keep some headroom for large file
// bytes over slow connections.
export const maxDuration = 60;

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

// Column selection (storage_path intentionally omitted — clients reach bytes
// only via the /file proxy by id). Shared so list/detail/extraction/check agree.
const LIST_COLUMNS = DOCUMENT_COLUMNS;

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
  const dateFrom   = searchParams.get("date_from")?.trim()  || null;
  const dateTo     = searchParams.get("date_to")?.trim()    || null;
  const limit      = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
  const offset     = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const supabase = createServerClient();
  let query = supabase
    .from("financial_documents")
    .select(LIST_COLUMNS, { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // status + doc_date range are list-specific; the rest are the shared content
  // filters (same chain the export ZIP uses — see lib/document-filters).
  if (status)   query = query.eq("status", status);
  if (dateFrom) query = query.gte("doc_date", dateFrom);
  if (dateTo)   query = query.lte("doc_date", dateTo);
  query = applyDocContentFilters(query, readDocContentFilters(searchParams));

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin/documents GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ documents: data ?? [], count: count ?? (data?.length ?? 0) });
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

  const bytes = await file.arrayBuffer();
  // Authoritative SHA-256 (server-computed — never trust a client hash for
  // storage or the dedup decision).
  const fileHash = sha256Hex(bytes);

  // Override flags: "החלף" sends replace_id (the live doc it supersedes),
  // "העלה בכל זאת" sends allow_duplicate=true. Either bypasses the block.
  const replaceId = (formData.get("replace_id") as string | null)?.trim() || null;
  const allowDuplicate = formData.get("allow_duplicate") === "true" || !!replaceId;

  // ── Hard duplicate block (the real safety net) ─────────────────────────────
  // Enforced server-side even if the client pre-check was bypassed: a live
  // document with the same file_hash blocks the upload (no bucket write, no
  // insert) and returns the existing row so the client can show the compare
  // dialog. Skipped only on an explicit override.
  if (!allowDuplicate) {
    const { data: existing } = await supabase
      .from("financial_documents")
      .select(LIST_COLUMNS)
      .eq("file_hash", fileHash)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "duplicate", duplicate: true, document: existing },
        { status: 409 },
      );
    }
  }

  // Path: inbox/<random-uuid>.<ext>. Extension is derived from the declared
  // MIME (not the user filename) — prevents extension spoofing.
  const ext  = EXT_FROM_MIME[declaredType] ?? "bin";
  const path = `inbox/${randomUUID()}.${ext}`;

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

  // From here on the bucket already holds the file, so EVERY exit path must
  // either persist the DB row OR remove that file — otherwise we leak an
  // orphan to storage that nobody will reap. The previous version handled
  // only `insertErr` (insert returning a Supabase error); a thrown exception
  // in resolveAdminLabel or in the insert call itself would bypass it. The
  // try/catch closes that gap by ensuring the rollback fires regardless of
  // how this block fails.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let row: any;
  try {
    const adminId = getAdminIdFromRequest(req);
    const uploaded_by = await resolveAdminLabel(supabase, adminId);

    const { data: inserted, error: insertErr } = await supabase
      .from("financial_documents")
      .insert({
        storage_path:      path,
        original_filename: originalFilename,
        mime_type:         declaredType,
        file_size:         file.size,
        file_hash:         fileHash,
        uploaded_by,
        extraction_status: "pending",
        status:            "pending",
      })
      .select(LIST_COLUMNS)
      .single();

    if (insertErr) throw insertErr;
    row = inserted;
  } catch (e) {
    console.error("[admin/documents POST] DB insert failed, rolling back upload:", e);
    try { await supabase.storage.from(BUCKET).remove([path]); } catch { /* best effort */ }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // "החלף": now that the replacement is safely stored, soft-delete the old doc.
  // Done after the insert so a failed upload never loses the original.
  if (replaceId) {
    const { error: replaceErr } = await supabase
      .from("financial_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", replaceId)
      .is("deleted_at", null);
    if (replaceErr) console.error("[admin/documents POST] replace soft-delete failed:", replaceErr);
  }

  // Extraction is DECOUPLED from upload: we return immediately with the row at
  // extraction_status='pending'. The client then calls
  // POST /api/admin/documents/[id]/extract per document — a separate request
  // with its own maxDuration — so a slow multi-page PDF can no longer push this
  // upload past the function timeout (the old 504 + HTML-instead-of-JSON bug).
  return NextResponse.json(
    {
      document: row,
      extraction: { status: "pending", error: null },
    },
    { status: 201 },
  );
}
