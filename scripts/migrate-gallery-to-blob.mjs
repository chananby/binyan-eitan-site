#!/usr/bin/env node
/**
 * One-off migration: move gallery images that still live in /public up to
 * Vercel Blob, so their weight can eventually leave the repo (~38 MB).
 *
 * NOT part of the build. Run by hand.
 *
 * ─── What it does ──────────────────────────────────────────────────────────
 *   1. Lists gallery_images rows whose url is a local path (starts with "/",
 *      not "http") — images already on Blob are skipped.
 *   2. Reads each file from public/, uploads it to Vercel Blob under the same
 *      gallery/ prefix the admin uploader uses.
 *   3. Writes an .sql file with the UPDATE statements.
 *
 * ─── What it deliberately does NOT do ──────────────────────────────────────
 *   • It never writes to the database. The SQL is reviewed and run by hand,
 *     so the switchover is a decision, not a side effect of running a script.
 *   • It never deletes anything from public/. Three code paths still read
 *     those files (GALLERY_PROJECTS, PortfolioGallery's PROJECTS, and the five
 *     rich pages in src/data/projects) — deleting them is a separate, later
 *     stage after the site is verified serving from Blob.
 *
 * ─── Idempotency ───────────────────────────────────────────────────────────
 *   Blob paths are deterministic (addRandomSuffix:false), so a re-run
 *   overwrites the same object and yields the same URL — no duplicates. Rows
 *   already pointing at http(s) are skipped outright. The generated SQL matches
 *   on the OLD url, so applying it twice is a no-op.
 *
 * ─── Usage ─────────────────────────────────────────────────────────────────
 *   node scripts/migrate-gallery-to-blob.mjs --dry-run
 *   node scripts/migrate-gallery-to-blob.mjs --execute
 *
 *   --dry-run            list what would happen; no uploads, no files written
 *   --execute            actually upload and write the .sql
 *   --resize             downscale to 1920px / q0.82 before upload (see below)
 *   --source=db|api      where to list rows from (default: db)
 *   --api-base=<url>     with --source=api (default: https://binyaneitan.com)
 *   --out=<path>         SQL output path
 *
 *   env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *        BLOB_READ_WRITE_TOKEN (only needed with --execute)
 *
 * ─── On --resize ───────────────────────────────────────────────────────────
 *   Off by default, on purpose. The point of this migration is repo weight,
 *   and that is achieved by moving the files regardless of their size. next/image
 *   already optimises delivery, so downscaling changes nothing the visitor sees
 *   — it would only shrink stored masters, and it is the one irreversible step
 *   in an otherwise reversible migration. Enable it only if Blob storage ever
 *   actually matters.
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const PUBLIC_DIR = path.join(ROOT, "public");

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (name, dflt) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};

const DRY = has("--dry-run") || !has("--execute");
const RESIZE = has("--resize");
const SOURCE = val("source", "db");
const API_BASE = val("api-base", "https://binyaneitan.com");
const OUT = path.resolve(val("out", path.join(ROOT, "scripts/out/gallery-blob-urls.sql")));

const MAX_DIM = 1920;
const QUALITY = 82;

function bail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

/** Rows straight from Postgres — the source of truth (includes unpublished). */
async function listFromDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    bail(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n" +
        "  For a credential-free preview use: --source=api --dry-run",
    );
  }
  const res = await fetch(
    `${url}/rest/v1/gallery_images?select=id,url,project_slug&deleted_at=is.null&url=not.like.http*&order=project_slug,sort_order`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) bail(`Supabase returned ${res.status}: ${await res.text()}`);
  return await res.json();
}

/**
 * Rows derived from the public gallery endpoint. Needs no credentials, which
 * makes a dry run possible anywhere — but it only sees PUBLISHED projects, so
 * the real run should use the db source.
 */
async function listFromApi() {
  const res = await fetch(`${API_BASE}/api/gallery`);
  if (!res.ok) bail(`${API_BASE}/api/gallery returned ${res.status}`);
  const projects = await res.json();
  const rows = [];
  const seen = new Set();
  for (const p of projects) {
    for (const u of p.images ?? []) {
      if (!u || u.startsWith("http") || seen.has(u)) continue;
      seen.add(u);
      rows.push({ id: null, url: u, project_slug: p.id });
    }
  }
  return rows;
}

function sq(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

async function main() {
  console.log(`\n${DRY ? "DRY RUN — nothing will be uploaded or written" : "EXECUTING — uploading to Blob"}`);
  console.log(`source: ${SOURCE}${SOURCE === "api" ? ` (${API_BASE}, published projects only)` : ""}`);
  console.log(`resize: ${RESIZE ? `yes — ${MAX_DIM}px / q${QUALITY}` : "no (originals uploaded as-is)"}\n`);

  const rows = SOURCE === "api" ? await listFromApi() : await listFromDb();
  if (rows.length === 0) {
    console.log("Nothing to migrate — no rows with a local /public path.\n");
    return;
  }

  let put, sharp;
  if (!DRY) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) bail("Missing BLOB_READ_WRITE_TOKEN (required with --execute)");
    ({ put } = await import("@vercel/blob"));
    if (RESIZE) sharp = (await import("sharp")).default;
  }

  const updates = [];
  const failures = [];
  let totalBytes = 0;

  for (const row of rows) {
    // Strip the leading slash and refuse anything that escapes public/.
    const rel = decodeURIComponent(row.url).replace(/^\/+/, "");
    const abs = path.join(PUBLIC_DIR, rel);
    if (!abs.startsWith(PUBLIC_DIR + path.sep)) {
      failures.push({ url: row.url, reason: "path escapes public/" });
      continue;
    }

    let stat;
    try {
      stat = await fs.stat(abs);
    } catch {
      failures.push({ url: row.url, reason: "file not found in public/" });
      continue;
    }
    totalBytes += stat.size;

    // Deterministic destination → re-running overwrites instead of duplicating.
    const dest = `gallery/_migrated/${rel}`;

    if (DRY) {
      updates.push({ old: row.url, dest, bytes: stat.size, slug: row.project_slug });
      continue;
    }

    try {
      let body = await fs.readFile(abs);
      if (RESIZE) {
        body = await sharp(body)
          .rotate()
          .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: QUALITY })
          .toBuffer();
      }
      const blob = await put(dest, body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: rel.endsWith(".png") ? "image/png" : rel.endsWith(".webp") ? "image/webp" : "image/jpeg",
      });
      updates.push({ old: row.url, dest, newUrl: blob.url, bytes: stat.size, slug: row.project_slug });
      console.log(`  ✓ ${rel}  →  ${blob.url}`);
    } catch (e) {
      failures.push({ url: row.url, reason: e instanceof Error ? e.message : String(e) });
      console.error(`  ✖ ${rel}: ${e?.message ?? e}`);
    }
  }

  // ── Report ───────────────────────────────────────────────────────────────
  const mb = (b) => (b / 1048576).toFixed(1);
  console.log(`\n${"─".repeat(60)}`);
  console.log(`rows needing migration : ${rows.length}`);
  console.log(`${DRY ? "would upload" : "uploaded"}           : ${updates.length}  (${mb(totalBytes)} MB from public/)`);
  console.log(`failed                 : ${failures.length}`);
  for (const f of failures) console.log(`   ✖ ${f.url} — ${f.reason}`);

  // ── SQL ──────────────────────────────────────────────────────────────────
  // Matched on the OLD url: naturally idempotent, since after the update no row
  // matches any more. Re-running the file is a no-op.
  const lines = [
    "-- Gallery images: repoint /public paths at Vercel Blob.",
    "-- Generated by scripts/migrate-gallery-to-blob.mjs — review before running.",
    "-- Idempotent: each statement matches the OLD url, so a second run is a no-op.",
    "-- The files stay in public/ for now; three code paths still read them.",
    "",
    "BEGIN;",
    "",
  ];
  for (const u of updates) {
    lines.push(
      `UPDATE gallery_images SET url = ${sq(u.newUrl ?? "<PENDING — dry run>")}` +
        ` WHERE url = ${sq(u.old)} AND deleted_at IS NULL;   -- ${u.slug}`,
    );
  }
  lines.push("", "-- Sanity check — expect 0 rows still on a local path:",
    "-- SELECT count(*) FROM gallery_images WHERE deleted_at IS NULL AND url NOT LIKE 'http%';",
    "", "COMMIT;", "");
  const sql = lines.join("\n");

  if (DRY) {
    console.log(`\nSQL preview (first 6 of ${updates.length} statements):`);
    console.log(sql.split("\n").filter((l) => l.startsWith("UPDATE")).slice(0, 6).join("\n"));
    console.log(`\n(no file written — dry run. would write: ${path.relative(ROOT, OUT)})\n`);
  } else {
    await fs.mkdir(path.dirname(OUT), { recursive: true });
    await fs.writeFile(OUT, sql);
    console.log(`\nSQL written: ${path.relative(ROOT, OUT)}`);
    console.log("Review it, then run it in the Supabase SQL editor.\n");
  }
}

main().catch((e) => bail(e?.stack ?? String(e)));
