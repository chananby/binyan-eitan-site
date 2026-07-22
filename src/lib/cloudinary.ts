/**
 * Image URL helper for the project gallery and per-project (rich) pages.
 *
 * ─── Current behaviour (July 2026) ─────────────────────────────────────────
 *  Serves the gallery images from Vercel Blob. They were migrated there in
 *  gallery round 3 (stage A), under a deterministic gallery/_migrated/ prefix
 *  whose object names are exactly the old /public filenames. Serving from Blob
 *  lets the /public copies be removed AND keeps this path working during a
 *  Supabase outage — Blob is a separate service, so the hard-coded fallbacks
 *  (GALLERY_PROJECTS, the rich pages) stay usable when the DB is down.
 *
 *  Every gallery filename passed here (verified in stage 0) exists on Blob at
 *  ${BLOB_BASE}/<filename>.
 *
 * ─── Modes ─────────────────────────────────────────────────────────────────
 *  "blob"       → Vercel Blob (current).
 *  "public"     → /public paths (pre-migration; kept for a quick rollback).
 *  "cloudinary" → the old, never-populated Cloudinary path (dormant).
 */

const SERVE_FROM: "blob" | "public" | "cloudinary" = "blob";

/** Vercel Blob base for the migrated gallery images (host is the project's
 *  Blob store; the prefix mirrors the migration's BLOB_PREFIX). */
const BLOB_BASE =
  "https://gz8avf0tzwxeqwsx.public.blob.vercel-storage.com/gallery/_migrated";

/** Base Cloudinary folder — used only when SERVE_FROM === "cloudinary" */
const FOLDER = "binyan-eitan";

/** Accepts either a plain cloud name ("da5fksoyc") or a full Cloudinary URI
 *  ("cloudinary://<key>:<secret>@<cloud_name>", optionally prefixed with
 *  "CLOUDINARY_URL=" if someone pasted the dashboard snippet verbatim).
 *  Returns just the cloud name in all cases, or undefined if the env is
 *  unset / unparseable. */
function extractCloudName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const uriMatch = value.match(/@([^/?#\s]+)/);
  if (uriMatch) return uriMatch[1];
  return value.trim() || undefined;
}

/**
 * Returns a URL for a public-asset filename.
 * Pass the same filenames you use in /public, e.g. "amshinov-1.jpg".
 *
 *   img("amshinov-1.jpg")  → "/amshinov-1.jpg"   (current)
 *   img("amshinov-1.jpg")  → cloudinary URL      (when SERVE_FROM === "cloudinary")
 *
 * `transforms` is ignored in the /public branch (Cloudinary-only directives
 * like f_auto/q_auto) — Next.js Image still does its own optimisation on
 * /public assets.
 */
export function img(filename: string, transforms = "f_auto,q_auto,w_1920"): string {
  // Blob object names are the bare filenames (no leading slash). next/image
  // still optimises delivery, so the Cloudinary-style transforms are ignored
  // here just as they were for /public.
  if (SERVE_FROM === "blob") return `${BLOB_BASE}/${filename}`;
  if (SERVE_FROM === "public") return `/${filename}`;
  const cloud = extractCloudName(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
  if (!cloud) return `/${filename}`;
  // Cloudinary uses the public_id without the file extension.
  const publicId = `${FOLDER}/${filename.replace(/\.[^.]+$/, "")}`;
  return `https://res.cloudinary.com/${cloud}/image/upload/${transforms}/${publicId}`;
}

/**
 * Smaller variant for thumbnails (lightbox strip, og images, etc.)
 * Same /public output as img() while SERVE_FROM === "public".
 */
export function thumb(filename: string): string {
  return img(filename, "f_auto,q_auto,w_400,c_fill,g_auto");
}
