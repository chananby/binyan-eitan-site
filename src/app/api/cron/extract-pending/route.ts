/**
 * GET /api/cron/extract-pending — Vercel-cron backstop for stalled extractions.
 *
 * Runs on the schedule in vercel.json (every 10 min). Picks up rows still
 * sitting at extraction_status='pending' inside the resume window and re-fires
 * extract on each. This is the safety net for the gap between "client closes
 * mid-upload" and "next admin reopens the inbox" — without it, a row could
 * sit on the queue for hours before anyone notices.
 *
 * Auth: when CRON_SECRET is set as a Vercel env var, the platform attaches
 * `Authorization: Bearer ${CRON_SECRET}` to scheduled invocations. We accept
 * only that header and reject everything else, so the URL is safe to expose.
 *
 * Idempotent: the underlying extractAndPersist updates the same row in-place.
 * If a row was picked up by the admin's resume-on-load and the cron at the
 * same time, last-writer-wins on the same row — no duplicate documents.
 *
 * The actual scan + extract loop is in src/lib/document-resume.ts; the admin
 * resume-pending route shares it.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { findAndResumePending } from "../../../../lib/document-resume";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No CRON_SECRET configured at all — refuse rather than running open. The
    // operator must set it on Vercel before the schedule does anything.
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const result = await findAndResumePending(supabase);

  // Log for the Vercel cron tab — easier to spot a run that found nothing vs
  // one that's chewing through a real backlog.
  console.log(
    "[cron/extract-pending]",
    JSON.stringify({
      ts: new Date().toISOString(),
      found: result.found,
      succeeded: result.succeeded,
      failed: result.failed,
    }),
  );

  return NextResponse.json({
    ok: true,
    found: result.found,
    attempted: result.attempted,
    succeeded: result.succeeded,
    failed: result.failed,
  });
}
