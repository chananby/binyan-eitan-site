/**
 * POST /api/admin/documents/[id]/extract — (re)run AI extraction on one
 * document. Downloads the bytes, sends them to the Anthropic API, matches the
 * vendor, and writes the extracted fields + extraction_raw + extraction_status
 * back onto the row. Admin only. A document already in status='approved' is
 * left untouched (409) so a review decision can't be silently overwritten.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../../lib/admin-auth";
import { extractAndPersist } from "../../../../../../lib/document-extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await props.params;
  const supabase = createServerClient();

  const ext = await extractAndPersist(supabase, id);

  // Hard errors (not found / already approved / DB failure) with no row to return.
  if (!ext.document && ext.httpStatus) {
    return NextResponse.json({ error: ext.error }, { status: ext.httpStatus });
  }

  return NextResponse.json({
    document: ext.document,
    extraction: { status: ext.status, error: ext.error ?? null },
  });
}
