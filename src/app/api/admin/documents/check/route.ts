/**
 * GET /api/admin/documents/check?hash=<sha256hex>
 *
 * Pre-upload duplicate probe. Returns the existing LIVE document whose
 * file_hash matches (so the client can show the compare dialog before sending
 * the file), or { duplicate: false }. Admin only. This is a UX convenience —
 * the authoritative block lives in POST /api/admin/documents (the 409).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { DOCUMENT_COLUMNS } from "../../../../../lib/document-columns";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hash = new URL(req.url).searchParams.get("hash")?.trim();
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    return NextResponse.json({ error: "hash לא תקין" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("financial_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("file_hash", hash)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[admin/documents/check]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ? { duplicate: true, document: data } : { duplicate: false });
}
