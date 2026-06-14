/**
 * POST /api/foreman/documents — foreman drop-box upload.
 *
 * "Drop and forget" channel for site managers: upload a photo/PDF of an
 * invoice or receipt, get a thank-you. ZERO financial exposure — the
 * response is ONLY { ok: true } (never the row, the extraction, amounts,
 * vendor, or status). Listing / reviewing financial documents stays
 * admin-only under /api/admin/documents.
 *
 * Same bucket, validation, and inline AI extraction as the admin upload
 * (/api/admin/documents POST); differences:
 *   - guarded by getForemanStaffIdFromRequest (not admin)
 *   - uploaded_by = "foreman:<name>" (or "admin:<name> (בתור <foreman>)" when
 *     an admin is acting through this foreman via view-as)
 *   - project_id auto-set to the foreman's assigned project when they own
 *     exactly one (same lookup as the today/report routes); else null
 *   - the extraction result is intentionally NOT returned
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { getForemanStaffIdFromRequest } from "../../../../lib/admin-auth";
import { resolveActorLabel } from "../../../../lib/audit-actor";
import { extractAndPersist } from "../../../../lib/document-extraction";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
// Runs AI extraction inline (await) before responding — give it room.
export const maxDuration = 60;

const BUCKET = "financial-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — same cap as the admin upload
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

export async function POST(req: NextRequest) {
  const staffId = getForemanStaffIdFromRequest(req);
  if (!staffId) {
    return NextResponse.json({ error: "יש להזדהות מחדש" }, { status: 401 });
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

  const supabase = createServerClient();

  // Actor label: "foreman:<name>" normally, or "admin:<name> (בתור <foreman>)"
  // when an admin is acting through this foreman via view-as.
  const uploaded_by = await resolveActorLabel(supabase, req);

  // Assigned project: tag the document only when the foreman owns exactly one
  // project (unambiguous). 0 or >1 → leave null for the admin to set.
  const { data: foremanProjects } = await supabase
    .from("projects")
    .select("id")
    .eq("foreman_id", staffId);
  const projectId = (foremanProjects?.length === 1) ? foremanProjects[0].id : null;

  // Upload bytes: inbox/<uuid>.<ext>, extension from MIME (not filename).
  const ext  = EXT_FROM_MIME[declaredType] ?? "bin";
  const path = `inbox/${randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: declaredType, upsert: false });
  if (uploadErr) {
    console.error("[foreman/documents POST] storage error:", uploadErr);
    return NextResponse.json({ error: "העלאת הקובץ נכשלה" }, { status: 500 });
  }

  const { data: row, error: insertErr } = await supabase
    .from("financial_documents")
    .insert({
      storage_path:      path,
      original_filename: file.name.slice(0, 200),
      mime_type:         declaredType,
      file_size:         file.size,
      uploaded_by,
      extraction_status: "pending",
      status:            "pending",
      ...(projectId ? { project_id: projectId } : {}),
    })
    .select("id")
    .single();

  if (insertErr) {
    // Roll the bucket write back so we never have an orphan object.
    console.error("[foreman/documents POST] DB insert failed, rolling back:", insertErr);
    try { await supabase.storage.from(BUCKET).remove([path]); } catch { /* best effort */ }
    return NextResponse.json({ error: "השמירה נכשלה" }, { status: 500 });
  }

  // Run AI extraction inline. extractAndPersist never writes project_id, so the
  // assignment-derived value above is preserved. The result is deliberately
  // discarded — a failed extraction still leaves the row saved (admin sees it
  // as failed in the inbox) and the foreman still gets { ok: true }.
  try {
    await extractAndPersist(supabase, (row as { id: string }).id);
  } catch (e) {
    console.error("[foreman/documents POST] extraction error (non-fatal):", e);
  }

  return NextResponse.json({ ok: true });
}
