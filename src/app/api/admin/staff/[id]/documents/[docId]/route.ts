/**
 * /api/admin/staff/[id]/documents/[docId]
 *   GET    — server-proxy download. Streams the file bytes from the
 *            private `staff-documents` bucket. No signed URL is issued
 *            (and never has been), so this is the ONLY way a client can
 *            obtain document bytes.
 *   DELETE — remove the file from the bucket AND the row from
 *            staff_documents. Both deletions are best-effort: a row
 *            without a file is harmless; a file without a row is
 *            unreachable but wastes storage — we log and surface either
 *            failure but don't fail loudly.
 *
 * Admin only. Both endpoints verify the doc's staff_id matches the [id]
 * in the URL before doing anything, so the URL pattern itself can't be
 * used to scan another worker's documents.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../../../lib/admin-auth";

export const runtime = "nodejs";

const BUCKET = "staff-documents";

async function loadDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  staffId: string,
  docId: string,
): Promise<
  | { ok: true;  doc: { id: string; file_path: string; file_name: string; mime_type: string | null } }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await supabase
    .from("staff_documents")
    .select("id, staff_id, file_path, file_name, mime_type")
    .eq("id", docId)
    .maybeSingle();
  if (error) {
    console.error("[admin/staff/documents lookup]", JSON.stringify(error));
    return { ok: false, status: 500, error: error.message };
  }
  if (!data) return { ok: false, status: 404, error: "מסמך לא נמצא" };
  // Cross-check the URL's [id] against the document's owner. A mismatch
  // means the admin is guessing IDs across workers — refuse rather than
  // serve the file.
  if (data.staff_id !== staffId) {
    return { ok: false, status: 404, error: "מסמך לא נמצא" };
  }
  return { ok: true, doc: { id: data.id, file_path: data.file_path, file_name: data.file_name, mime_type: data.mime_type } };
}

// ── GET — server-proxy download ─────────────────────────────────────────────
export async function GET(req: NextRequest, props: { params: Promise<{ id: string; docId: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = await props.params;
  const supabase = createServerClient();

  const lookup = await loadDoc(supabase, params.id, params.docId);
  if (!lookup.ok) return NextResponse.json({ error: lookup.error }, { status: lookup.status });
  const doc = lookup.doc;

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(doc.file_path);
  if (dlErr || !blob) {
    console.error("[admin/staff/documents GET]", dlErr?.message);
    return NextResponse.json({ error: "שגיאה בשליפת הקובץ" }, { status: 500 });
  }

  // Stream the bytes back with the right Content-Type so PDFs open
  // inline and images render natively. Content-Disposition is set to
  // "inline" with the human-supplied file name so a Save-As yields
  // something readable to the admin.
  const arrayBuffer = await blob.arrayBuffer();
  const contentType = doc.mime_type ?? "application/octet-stream";
  // RFC 5987-style filename* so Hebrew display names survive intact.
  const dispositionName = encodeURIComponent(doc.file_name);
  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(arrayBuffer.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${dispositionName}`,
      "Cache-Control": "private, no-store",
    },
  });
}

// ── DELETE — drop file from bucket + row from DB ────────────────────────────
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string; docId: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = await props.params;
  const supabase = createServerClient();

  const lookup = await loadDoc(supabase, params.id, params.docId);
  if (!lookup.ok) return NextResponse.json({ error: lookup.error }, { status: lookup.status });
  const doc = lookup.doc;

  // Best-effort bucket cleanup first — if it fails we still want the DB
  // row gone so the admin can re-upload, but we log so an orphan can be
  // reaped manually later.
  const { error: rmErr } = await supabase.storage.from(BUCKET).remove([doc.file_path]);
  if (rmErr) {
    console.warn("[admin/staff/documents DELETE] bucket remove failed:", rmErr.message);
  }

  const { error: dbErr } = await supabase
    .from("staff_documents")
    .delete()
    .eq("id", doc.id);
  if (dbErr) {
    console.error("[admin/staff/documents DELETE] DB delete failed:", dbErr);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
