// Shared helper for "resume stalled extractions" — the brains of two routes:
//
//   • /api/admin/documents/resume-pending  (admin POST, called on inbox load)
//   • /api/cron/extract-pending            (Vercel-cron GET, every 10 min)
//
// Picks the SAME set of rows in both — extraction_status='pending', not
// soft-deleted, old enough that the normal client-driven extract had its
// chance, but young enough that we aren't trying to revive truly ancient
// zombies. The window is deliberately narrow so a row that's actually been
// stuck for weeks (and might depend on missing storage) isn't retried over
// and over by every page load.
//
// Idempotency: extractAndPersist updates the same row in-place. If two callers
// race (e.g. cron fires while the admin's inbox auto-resume is mid-flight),
// last-write-wins on the same row — no duplicate documents, no torn state.

import { extractAndPersist } from "./document-extraction";

// Default window: skip rows that are still inside their normal extract attempt
// (the inline POST takes a few seconds), but don't reach back further than a
// day — anything older has been seen by the admin already.
const DEFAULT_MIN_AGE_MIN = 5;
const DEFAULT_MAX_AGE_HOURS = 24;
const DEFAULT_LIMIT = 10;

export interface ResumeResult {
  /** Rows the SELECT matched (pre-cap). */
  found: number;
  /** Rows we actually fired extract on this run (capped by `limit`). */
  attempted: number;
  /** Of `attempted`: how many came back ok=true. */
  succeeded: number;
  /** Of `attempted`: how many came back ok=false (incl. 409 already-approved). */
  failed: number;
  /** Per-row outcome for debugging in the cron log. Capped to first 20 ids. */
  details: Array<{ id: string; ok: boolean; status?: string; error?: string }>;
}

export interface ResumeOptions {
  /** Skip rows newer than this many minutes — gives the regular client-driven
   *  extract a chance to finish before we step on it. */
  minAgeMinutes?: number;
  /** Don't reach back further than this — anything older is "truly stuck" and
   *  needs manual intervention, not blind retries every 10 min. */
  maxAgeHours?: number;
  /** Hard cap per invocation — keeps a single resume from spending minutes of
   *  function time on a backlog. 10 ≈ 30-50 s of AI work, comfortably under
   *  the 60 s maxDuration in the routes that call this. */
  limit?: number;
}

export async function findAndResumePending(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  opts: ResumeOptions = {},
): Promise<ResumeResult> {
  const minAgeMin = opts.minAgeMinutes ?? DEFAULT_MIN_AGE_MIN;
  const maxAgeHr  = opts.maxAgeHours   ?? DEFAULT_MAX_AGE_HOURS;
  const limit     = opts.limit         ?? DEFAULT_LIMIT;

  const now = Date.now();
  const olderThan = new Date(now - minAgeMin * 60 * 1000).toISOString();
  const newerThan = new Date(now - maxAgeHr * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("financial_documents")
    .select("id, created_at")
    .is("deleted_at", null)
    .eq("extraction_status", "pending")
    .lt("created_at", olderThan)
    .gt("created_at", newerThan)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { found: 0, attempted: 0, succeeded: 0, failed: 0, details: [{ id: "—", ok: false, error: error.message }] };
  }

  const list = rows ?? [];
  if (list.length === 0) {
    return { found: 0, attempted: 0, succeeded: 0, failed: 0, details: [] };
  }

  // Process serially — the AI calls are heavy and the Vercel function budget
  // is 60 s per route. With limit=10, even at ~5 s/doc we stay well inside.
  // Parallelism here would only ever buy us a few seconds, at the cost of
  // saturating the Anthropic concurrency budget shared with on-screen extracts.
  let succeeded = 0, failed = 0;
  const details: ResumeResult["details"] = [];
  for (const r of list) {
    try {
      const res = await extractAndPersist(supabase, r.id);
      if (res.ok) succeeded++; else failed++;
      details.push({ id: r.id, ok: res.ok, status: res.status, error: res.error });
    } catch (e) {
      failed++;
      details.push({ id: r.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return {
    found: list.length,
    attempted: list.length,
    succeeded,
    failed,
    details: details.slice(0, 20),
  };
}
