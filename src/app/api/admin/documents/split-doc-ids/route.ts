/**
 * GET /api/admin/documents/split-doc-ids
 *
 * Returns { ids: string[] } — the distinct financial_documents.id set that
 * currently has one or more LIVE splits attached. Consumers:
 *   • TriageClient uses it to drop already-split docs from the queue
 *     (they carry project_id=NULL but are effectively "assigned").
 *   • DocumentsInbox uses it to render the "מפוצל" badge without a per-
 *     row round-trip.
 *
 * Cheap in practice — the split table is tiny (< 30 rows expected) and
 * the response is just a flat id list. If it grows large we'd add a
 * paginated variant; for now a single flat fetch beats N-per-row.
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("document_project_splits")
    .select("document_id")
    .is("deleted_at", null);
  if (error) {
    console.error("[split-doc-ids]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // De-dup (a doc split across 3 projects gets returned 3 times).
  const ids = [...new Set((data ?? []).map((r) => r.document_id))];
  return NextResponse.json({ ids });
}
