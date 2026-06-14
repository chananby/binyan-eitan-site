/**
 * POST /api/admin/documents/bulk — set status on many documents at once.
 *
 * Body: { ids: string[], status: "approved" | "rejected" | "pending" }
 *
 * Powers "approve all high-confidence" and its Undo. Single UPDATE over the id
 * set. reviewed_by/reviewed_at are stamped SERVER-SIDE from the admin token
 * (never the body) — same posture as the per-document PATCH; reverting to
 * pending clears the stamp. Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest, getAdminIdFromRequest } from "../../../../../lib/admin-auth";
import { DOCUMENT_COLUMNS } from "../../../../../lib/document-columns";

export const runtime = "nodejs";

const ALLOWED = new Set(["approved", "rejected", "pending"]);

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ids?: unknown; status?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
  const status = typeof body.status === "string" ? body.status : "";
  if (ids.length === 0) {
    return NextResponse.json({ error: "לא נבחרו מסמכים" }, { status: 400 });
  }
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: "status לא תקין" }, { status: 400 });
  }

  const update: Record<string, unknown> =
    status === "pending"
      ? { status, reviewed_at: null, reviewed_by: null }
      : { status, reviewed_at: new Date().toISOString(), reviewed_by: getAdminIdFromRequest(req) };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("financial_documents")
    .update(update)
    .in("id", ids)
    .is("deleted_at", null)
    .select(DOCUMENT_COLUMNS);

  if (error) {
    console.error("[admin/documents/bulk]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: data?.length ?? 0, documents: data ?? [] });
}
