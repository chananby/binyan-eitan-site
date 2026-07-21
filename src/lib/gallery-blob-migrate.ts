/**
 * Shared core for moving gallery images out of /public and onto Vercel Blob.
 *
 * Used by BOTH entry points so the logic exists once:
 *   • POST /api/admin/gallery/migrate-to-blob  — the admin button
 *   • scripts/migrate-gallery-to-blob.ts       — the terminal route
 *
 * ─── Two constraints shaped this ───────────────────────────────────────────
 *
 * 1. Files are fetched over HTTP, not read from disk. On Vercel, public/ is
 *    served by the CDN and is NOT present in the serverless function's
 *    filesystem — fs.readFile("public/x.jpg") would fail in production. Pulling
 *    the file from the site's own public URL works identically locally and
 *    deployed, and needs no bundling tricks.
 *
 * 2. It NEVER writes to the database. It uploads, and returns SQL for a human
 *    to review and run. Every DB write in this project goes through Chanan.
 *
 * Nothing is ever deleted — not from public/, not from the DB, not from Blob.
 */

export interface LocalImageRow {
  id: string;
  url: string;
  project_slug: string;
}

export interface MigratedImage {
  oldUrl: string;
  newUrl: string;
  bytes: number;
  projectSlug: string;
}

export interface MigrationFailure {
  url: string;
  reason: string;
}

/** Blob destination prefix — mirrors the admin uploader's gallery/ namespace. */
const BLOB_PREFIX = "gallery/_migrated";

/** Minimal shape we need from the Supabase client (keeps this testable). */
interface SupabaseLike {
  from(table: string): {
    select(cols: string): {
      is(col: string, val: null): {
        not(col: string, op: string, val: string): {
          order(col: string, opts: { ascending: boolean }): Promise<{
            data: unknown;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
}

/**
 * Every live gallery_images row still pointing at a local /public path.
 * Rows already on http(s) are excluded in the query — that is what makes a
 * re-run a no-op rather than a duplicate upload.
 */
export async function listLocalImageRows(supabase: SupabaseLike): Promise<LocalImageRow[]> {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("id, url, project_slug")
    .is("deleted_at", null)
    .not("url", "like", "http%")
    .order("project_slug", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as LocalImageRow[];
}

function contentTypeFor(pathname: string): string {
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

/**
 * Move ONE image. Returns the new Blob URL.
 *
 * `put` is injected so the caller supplies @vercel/blob — the endpoint and the
 * script both pass the same function, and this module stays import-light.
 *
 * The destination path is deterministic (addRandomSuffix:false + allowOverwrite),
 * so re-running overwrites the same object and produces the same URL instead of
 * piling up duplicates.
 */
export async function migrateOneImage(
  row: LocalImageRow,
  opts: {
    /** Origin to fetch public assets from, e.g. https://binyaneitan.com */
    baseUrl: string;
    /** @vercel/blob's `put`. Typed loosely so this module needn't import it. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    put: (path: string, body: any, o: any) => Promise<{ url: string }>;
  },
): Promise<MigratedImage> {
  const rel = decodeURIComponent(row.url).replace(/^\/+/, "");
  if (!rel || rel.includes("..")) throw new Error("suspicious path");

  const res = await fetch(`${opts.baseUrl}/${rel}`);
  if (!res.ok) throw new Error(`fetch ${res.status} from /${rel}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0) throw new Error("empty file");

  // Originals are uploaded untouched — no downscaling. The goal is repo weight,
  // which moving the file achieves; next/image still optimises delivery, and a
  // resize would be the one irreversible step in a reversible migration.
  const blob = await opts.put(`${BLOB_PREFIX}/${rel}`, bytes, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: contentTypeFor(rel),
  });

  return { oldUrl: row.url, newUrl: blob.url, bytes: bytes.length, projectSlug: row.project_slug };
}

function sq(s: string): string {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

/**
 * UPDATE statements for the migrated rows.
 *
 * Matched on the OLD url, which makes the file idempotent: once applied, no row
 * matches any more, so running it twice changes nothing.
 */
export function buildMigrationSql(updates: MigratedImage[]): string {
  if (updates.length === 0) return "-- nothing to update\n";
  const lines = [
    "-- Gallery images: repoint /public paths at Vercel Blob.",
    "-- The images are ALREADY uploaded. This only rewrites the URLs.",
    "-- Idempotent: each statement matches the OLD url, so re-running is a no-op.",
    "-- Nothing is deleted — the files stay in public/ (three code paths still read them).",
    "",
    "BEGIN;",
    "",
  ];
  for (const u of updates) {
    lines.push(
      `UPDATE gallery_images SET url = ${sq(u.newUrl)} WHERE url = ${sq(u.oldUrl)} AND deleted_at IS NULL;   -- ${u.projectSlug}`,
    );
  }
  lines.push(
    "",
    "-- Sanity check — expect 0 rows still on a local path:",
    "-- SELECT count(*) FROM gallery_images WHERE deleted_at IS NULL AND url NOT LIKE 'http%';",
    "",
    "COMMIT;",
    "",
  );
  return lines.join("\n");
}
