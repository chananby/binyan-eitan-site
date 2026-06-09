/**
 * /api/admin/staff/[id]/documents
 *   POST  — upload a new document for this worker (multipart/form-data:
 *           "file" + "file_name"). Writes the bytes to the private
 *           Supabase Storage bucket `staff-documents` under the path
 *           `<staff_id>/<random-uuid>.<ext>` and inserts a metadata row
 *           into staff_documents.
 *   GET   — list the worker's documents (id, file_name, mime_type, size,
 *           uploaded_at, uploaded_by). The bucket path is NOT exposed.
 *
 * Admin only. The bucket is private; download flows through
 * /api/admin/staff/[id]/documents/[docId] as a server-proxy stream, so
 * no signed URL is ever issued and no file URL can leak past the
 * admin session.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import {
  isAdminAuthedFromRequest,
  getAdminIdFromRequest,
} from "../../../../../../lib/admin-auth";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const BUCKET = "staff-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
// Sensitive-document whitelist: PDF (contracts, certificates) + the
// common image formats workers will photograph their ID with.
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

// ── GET — list documents for one worker ─────────────────────────────────────
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = await props.params;
  const supabase = createServerClient();

  // Confirm the worker exists (avoids leaking "no docs" vs "no worker")
  const { data: worker } = await supabase
    .from("staff")
    .select("id")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!worker) {
    return NextResponse.json({ error: "עובד לא נמצא" }, { status: 404 });
  }

  // file_path is intentionally OMITTED from the response — clients never
  // need the bucket path; the download endpoint identifies docs by id.
  const { data, error } = await supabase
    .from("staff_documents")
    .select("id, file_name, mime_type, file_size, uploaded_by, uploaded_at")
    .eq("staff_id", params.id)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[admin/staff/documents GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ documents: data ?? [] });
}

// ── POST — upload one document ──────────────────────────────────────────────
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = await props.params;

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = formData.get("file") as File | null;
  const rawName = formData.get("file_name");
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
  // Display name: client-supplied free text. Fall back to original file
  // name if the admin left the field blank.
  const fileName = typeof rawName === "string" && rawName.trim()
    ? rawName.trim().slice(0, 200)
    : file.name.slice(0, 200);

  const supabase = createServerClient();

  // Verify worker exists (and isn't deleted) BEFORE uploading bytes —
  // surfaces a clean 404 instead of a dangling object in the bucket.
  const { data: worker } = await supabase
    .from("staff")
    .select("id")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!worker) {
    return NextResponse.json({ error: "עובד לא נמצא" }, { status: 404 });
  }

  // Path: <staff_id>/<random-uuid>.<ext>. Extension is derived from the
  // declared MIME (not from user filename) — prevents path/extension
  // spoofing via a crafted .pdf.exe filename.
  const ext  = EXT_FROM_MIME[declaredType] ?? "bin";
  const path = `${params.id}/${randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: declaredType,
      upsert: false,
    });

  if (uploadErr) {
    console.error("[admin/staff/documents POST] storage error:", uploadErr);
    const msg = uploadErr.message.includes("Bucket not found")
      ? "דלי אחסון 'staff-documents' לא קיים — צור אותו ב-Supabase Storage עם Public=OFF"
      : uploadErr.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const adminId = getAdminIdFromRequest(req);
  const uploaded_by = await resolveAdminLabel(supabase, adminId);

  const { data: row, error: insertErr } = await supabase
    .from("staff_documents")
    .insert({
      staff_id:  params.id,
      file_path: path,
      file_name: fileName,
      mime_type: declaredType,
      file_size: file.size,
      uploaded_by,
    })
    .select("id, file_name, mime_type, file_size, uploaded_by, uploaded_at")
    .single();

  if (insertErr) {
    // Roll the bucket write back so we never have an orphan object.
    console.error("[admin/staff/documents POST] DB insert failed, rolling back upload:", insertErr);
    try { await supabase.storage.from(BUCKET).remove([path]); } catch { /* best effort */ }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ document: row }, { status: 201 });
}
