/**
 * Image URL helper for the project gallery and per-project pages.
 *
 * ─── Current behaviour (May 2026) ──────────────────────────────────────────
 *  Serves images directly from /public. The "binyan-eitan" folder on
 *  Cloudinary (account da5fksoyc) is empty, so building Cloudinary URLs
 *  here would produce 404s and break /he/projects. /public works on every
 *  deploy because the files ship with the bundle.
 *
 * ─── Phase B (planned) ────────────────────────────────────────────────────
 *  Once images are uploaded to the binyan-eitan/ folder on Cloudinary
 *  (with the public_ids matching the filenames here, sans extension), flip
 *  SERVE_FROM to "cloudinary". The Cloudinary branch below is exercised
 *  again automatically. No call sites need to change.
 *
 *  Folder structure expected on Cloudinary:
 *    binyan-eitan/amshinov-1.jpg
 *    binyan-eitan/bayit-vegan-1.jpg
 *    ... (same filenames as in /public)
 */

const SERVE_FROM: "public" | "cloudinary" = "public";

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
