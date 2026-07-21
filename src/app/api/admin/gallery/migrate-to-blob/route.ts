/**
 * POST /api/admin/gallery/migrate-to-blob — admin-only.
 *
 * Moves gallery images that still live in /public up to Vercel Blob, so their
 * weight can eventually leave the repo. Exists as an endpoint because the
 * equivalent script needs SUPABASE_SERVICE_ROLE_KEY and BLOB_READ_WRITE_TOKEN,
 * which we are not handing to a workstation — the server already holds them.
 *
 * ─── It never writes to the database ───────────────────────────────────────
 * It uploads the images and returns SQL. Chanan reviews it and runs it in the
 * Supabase SQL editor. That keeps the project's rule intact: every DB write
 * goes through him. Nothing is deleted either — not public/, not the DB, not
 * Blob.
 *
 * ─── Batched on purpose ────────────────────────────────────────────────────
 * 74 files / 19 MB in one request would blow past the function's time limit and
 * leave a half-finished state. The client walks the list with offset/limit and
 * gets `nextOffset` back, so progress is visible and a stall costs one batch,
 * not the whole run. Re-running is safe: rows already on http are excluded by
 * the query and Blob paths are deterministic.
 *
 * Body: { mode?: "dry-run" | "execute", offset?: number, limit?: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";
import {
  listLocalImageRows,
  migrateOneImage,
  buildMigrationSql,
  type MigratedImage,
  type MigrationFailure,
} from "../../../../../lib/gallery-blob-migrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Files per request. Each one is a CDN fetch plus a Blob upload (~1-3 s, and
 *  the largest asset is 2.3 MB), so five leaves a wide margin under 60 s. */
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { mode?: string; offset?: number; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body → dry-run defaults */
  }

  const execute = body.mode === "execute";
  const offset = Math.max(0, Math.trunc(Number(body.offset) || 0));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(Number(body.limit) || DEFAULT_LIMIT)));

  let rows;
  try {
    rows = await listLocalImageRows(createServerClient() as never);
  } catch (e) {
    console.error("[gallery/migrate-to-blob list]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "List failed" }, { status: 500 });
  }

  const total = rows.length;

  // ── Dry run: report scope only. No fetching, no uploading, no writing. ──
  if (!execute) {
    return NextResponse.json({
      mode: "dry-run",
      total,
      message:
        total === 0
          ? "אין תמונות להעברה — כל השורות כבר מצביעות ל-Blob."
          : `${total} תמונות עדיין מוגשות מ-/public ויועברו ל-Blob.`,
    });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not configured" }, { status: 500 });
  }

  // Fetch public assets from this same deployment, so the run works on preview
  // and production alike without hard-coding a domain.
  const baseUrl = req.nextUrl.origin;
  const { put } = await import("@vercel/blob");

  const batch = rows.slice(offset, offset + limit);
  const migrated: MigratedImage[] = [];
  const failures: MigrationFailure[] = [];

  for (const row of batch) {
    try {
      migrated.push(await migrateOneImage(row, { baseUrl, put }));
    } catch (e) {
      // One bad file must not abort the batch — collect and carry on.
      failures.push({ url: row.url, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  const nextOffset = offset + batch.length;
  const done = nextOffset >= total;

  return NextResponse.json({
    mode: "execute",
    total,
    processed: nextOffset,
    done,
    nextOffset: done ? null : nextOffset,
    migrated,
    failures,
    // Partial SQL for this batch; the client concatenates as it goes.
    sql: buildMigrationSql(migrated),
  });
}
