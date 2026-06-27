/**
 * GET /api/admin/join-requests — list "new worker wants to join"
 * submissions for the admin queue UI.
 *
 *   ?status=pending  (default) — what the badge counts and the tab
 *                                opens on. Most everyday case.
 *   ?status=all                — full history including approved /
 *                                rejected. Used for "show closed too".
 *
 * Admin only. service_role; RLS-on with no policies. The PR 1 public
 * POST (/api/join-request) is the only writer most days; the admin
 * approve/reject path lives at the sibling [id] route.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const JR_COLUMNS =
  "id, full_name, phone, description, status, created_at, reviewed_at, staff_id, rejection_note";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusParam = (req.nextUrl.searchParams.get("status") ?? "pending").toLowerCase();
  if (statusParam !== "pending" && statusParam !== "all") {
    return NextResponse.json({ error: "status must be 'pending' or 'all'" }, { status: 400 });
  }

  const supabase = createServerClient();
  let q = supabase
    .from("join_requests")
    .select(JR_COLUMNS)
    .order("created_at", { ascending: false });
  if (statusParam === "pending") q = q.eq("status", "pending");

  const { data, error } = await q;
  if (error) {
    console.error("[admin/join-requests GET]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ requests: data ?? [] });
}
