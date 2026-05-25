/**
 * Cloudinary URL builder
 *
 * Uses NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME to construct delivery URLs.
 * Falls back to local /public paths when the env var is not set (dev without Cloudinary).
 *
 * Folder structure expected in your Cloudinary account:
 *   binyan-eitan/
 *     amshinov-1.jpg
 *     amshinov-2.jpg
 *     bayit-vegan-1.jpg
 *     ... (same filenames as in /public)
 *
 * To migrate: upload every file from /public to the "binyan-eitan" folder
 * in Cloudinary, keeping the exact same filenames.
 */

/** Accepts either a plain cloud name ("da5fksoyc") or a full Cloudinary URI
 *  ("cloudinary://<key>:<secret>@<cloud_name>", optionally prefixed with
 *  "CLOUDINARY_URL=" if someone pasted the dashboard snippet verbatim).
 *  Returns just the cloud name in all cases, or undefined if the env is
 *  unset / unparseable. Defensive: prevents the projects gallery from
 *  going dark when the Vercel env was set to the wrong format. */
function extractCloudName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // URI form has the cloud name as the host: "...@<cloud_name>[/path]"
  const uriMatch = value.match(/@([^/?#\s]+)/);
  if (uriMatch) return uriMatch[1];
  // Otherwise treat as a plain cloud name (trim defensively).
  return value.trim() || undefined;
}

const CLOUD = extractCloudName(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

/** Base Cloudinary folder — change this if you prefer a different structure */
const FOLDER = "binyan-eitan";

/**
 * Returns an optimized Cloudinary delivery URL for a given filename.
 * Pass the same filenames you use in /public, e.g. "amshinov-1.jpg"
 *
 * The transforms applied by default:
 *   f_auto  — serve WebP/AVIF automatically based on browser support
 *   q_auto  — smart quality (Cloudinary picks the best quality/size tradeoff)
 *   w_1920  — cap width at 1920px (sufficient for full-bleed gallery images)
 *
 * @example
 *   img("amshinov-1.jpg")
 *   // → "https://res.cloudinary.com/yourcloud/image/upload/f_auto,q_auto,w_1920/binyan-eitan/amshinov-1"
 */
export function img(filename: string, transforms = "f_auto,q_auto,w_1920"): string {
  if (!CLOUD) {
    // Local fallback — used during development when Cloudinary is not configured
    return `/${filename}`;
  }
  // Strip the file extension — Cloudinary uses the public_id without extension
  const publicId = `${FOLDER}/${filename.replace(/\.[^.]+$/, "")}`;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${transforms}/${publicId}`;
}

/**
 * Smaller variant for thumbnails (lightbox strip, og images, etc.)
 */
export function thumb(filename: string): string {
  return img(filename, "f_auto,q_auto,w_400,c_fill,g_auto");
}
