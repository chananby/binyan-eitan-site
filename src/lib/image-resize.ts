/**
 * Client-side image downscale — ports the canvas resizeImage() used in the
 * quote generator (public/admin-tools/quote-generator.html) into TS.
 *
 * Why: phone photos are 3–5 MB. Uploading dozens of them raw would stall the
 * batch and bloat Blob storage. Downscaling to ~1920px @ q0.8 in the browser
 * BEFORE upload turns each into ~200–500 KB, which is what makes bulk upload
 * usable. Runs entirely on the client — no server round-trip for the resize.
 *
 * Returns a JPEG Blob (not a dataURL) so it drops straight into FormData.
 */

export interface ResizeOptions {
  /** Longest-edge cap in px. Images already smaller are re-encoded, not upscaled. */
  maxDim?: number;
  /** JPEG quality 0–1. */
  quality?: number;
}

const DEFAULTS: Required<ResizeOptions> = { maxDim: 1920, quality: 0.8 };

/**
 * Downscale + re-encode an image File to a JPEG Blob.
 * Rejects if the file can't be decoded as an image.
 */
export function resizeImageToBlob(file: File, opts: ResizeOptions = {}): Promise<Blob> {
  const { maxDim, quality } = { ...DEFAULTS, ...opts };
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;

        // Already a JPEG within bounds → hand back the original untouched.
        // Re-encoding it could only add generation loss: the canvas would decode
        // and re-compress pixels that need no resizing. This matters most for
        // extracted video frames, which arrive as high-quality JPEGs already
        // sized to the source video. Anything oversized, or in another format
        // (PNG/HEIC/WebP), still goes through the canvas — the upload endpoint
        // only accepts jpeg/png/webp, so the conversion is doing real work there.
        if (file.type === "image/jpeg" && w <= maxDim && h <= maxDim) {
          resolve(file);
          return;
        }

        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob returned null"));
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}
