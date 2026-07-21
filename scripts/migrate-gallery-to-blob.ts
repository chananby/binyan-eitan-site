#!/usr/bin/env npx tsx
/**
 * Terminal route for the /public → Vercel Blob gallery migration.
 *
 * The same job is available as a button in the admin (which is what Chanan
 * uses, since the server already holds the credentials). This exists for
 * whoever prefers a shell and has the secrets to hand.
 *
 * The actual logic lives in src/lib/gallery-blob-migrate.ts and is shared with
 * POST /api/admin/gallery/migrate-to-blob — this file is only a CLI wrapper, so
 * the two can never drift apart.
 *
 *   npx tsx scripts/migrate-gallery-to-blob.ts --dry-run
 *   npx tsx scripts/migrate-gallery-to-blob.ts --execute
 *
 * env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *      BLOB_READ_WRITE_TOKEN (--execute only), BASE_URL (default production).
 *
 * Never writes to the database and never deletes anything: it uploads and
 * prints SQL for a human to run.
 */

import { createClient } from "@supabase/supabase-js";
import {
  listLocalImageRows,
  migrateOneImage,
  buildMigrationSql,
  type MigratedImage,
  type MigrationFailure,
} from "../src/lib/gallery-blob-migrate";

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const BASE_URL = process.env.BASE_URL || "https://binyaneitan.com";

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("\n✖ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY\n");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const rows = await listLocalImageRows(supabase as never);

  console.log(`\n${execute ? "EXECUTING" : "DRY RUN — nothing will be uploaded"}`);
  console.log(`rows still on a local /public path: ${rows.length}\n`);
  if (rows.length === 0 || !execute) {
    if (!execute && rows.length) console.log("Re-run with --execute to upload.\n");
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("✖ Missing BLOB_READ_WRITE_TOKEN\n");
    process.exit(1);
  }
  const { put } = await import("@vercel/blob");

  const migrated: MigratedImage[] = [];
  const failures: MigrationFailure[] = [];
  for (const row of rows) {
    try {
      const m = await migrateOneImage(row, { baseUrl: BASE_URL, put });
      migrated.push(m);
      console.log(`  ✓ ${row.url} → ${m.newUrl}`);
    } catch (e) {
      failures.push({ url: row.url, reason: e instanceof Error ? e.message : String(e) });
      console.error(`  ✖ ${row.url}: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\nuploaded: ${migrated.length} · failed: ${failures.length}\n`);
  console.log("── SQL — review, then run in the Supabase SQL editor ──\n");
  console.log(buildMigrationSql(migrated));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
