/**
 * POST /api/admin/documents/resume-pending — admin-triggered retry of stalled
 * extractions. Called by the inbox client on mount: it picks up any rows
 * stuck at extraction_status='pending' inside the resume window and fires
 * extract on each. Returns counts only — the page then re-fetches its
 * filtered list to show the updated chips.
 *
 * The actual scan + extract loop is in src/lib/document-resume.ts; both this
 * route and /api/cron/extract-pending share it so the policy stays in one
 * place. No body — the window + cap come from the helper's defaults.
 *
 * Admin only. Runtime budget mirrors the underlying /[id]/extract route
 * (60 s) so the worst-case serial loop of `limit` AI calls still fits.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import { findAndResumePending } from "../../../../../lib/document-resume";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const result = await findAndResumePending(supabase);
  return NextResponse.json({
    found: result.found,
    attempted: result.attempted,
    succeeded: result.succeeded,
    failed: result.failed,
  });
}
