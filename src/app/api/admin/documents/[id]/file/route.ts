/**
 * /api/admin/documents/[id]/file
 *   GET — server-proxy download. Streams the file bytes from the private
 *         `financial-documents` bucket. No signed URL is issued, so this is
 *         the ONLY way a client obtains the document bytes. Pattern copied
 *         1:1 from /api/admin/staff/[id]/documents/[docId].
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../../lib/admin-auth";

export const runtime = "nodejs";

const BUCKET = "financial-documents";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  const supabase = createServerClient();

  const { data: doc, error } = await supabase
    .from("financial_documents")
    .select("id, storage_path, original_filename, mime_type")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[admin/documents file lookup]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!doc) {
    return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(doc.storage_path);
  if (dlErr || !blob) {
    console.error("[admin/documents file GET]", dlErr?.message);
    return NextResponse.json({ error: "שגיאה בשליפת הקובץ" }, { status: 500 });
  }

  // Stream the bytes back with the right Content-Type so PDFs open inline
  // and images render natively. RFC 5987-style filename* keeps Hebrew names
  // intact through a Save-As.
  const arrayBuffer = await blob.arrayBuffer();
  const contentType = doc.mime_type ?? "application/octet-stream";
  const dispositionName = encodeURIComponent(doc.original_filename);
  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(arrayBuffer.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${dispositionName}`,
      "Cache-Control": "private, no-store",
    },
  });
}
