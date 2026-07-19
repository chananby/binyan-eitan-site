/**
 * Client-side video frame extraction — the video NEVER leaves the browser.
 *
 * Chanan has lots of site videos and wants stills from them in the gallery.
 * Uploading a video (hundreds of MB) just to grab 10 frames is wasteful, so the
 * browser decodes it locally with <video> + <canvas> and only the frames the
 * admin picks are uploaded — through the existing image path.
 *
 * Decoding depends entirely on the browser's codec support: MP4/H.264 is fine,
 * an iPhone .MOV/HEVC may not decode at all. Every failure mode here surfaces a
 * clear Hebrew message rather than failing silently (see VideoFrameError).
 *
 * Seeks are performed STRICTLY SEQUENTIALLY — parallel seeking on a single
 * <video> is unreliable across browsers (you get duplicate or blank frames).
 */

/** How many frames a single extraction pass grabs. Tweak here. */
export const FRAME_COUNT = 10;
/** Fraction of the start/end skipped — usually camera movement / blur. */
const EDGE_SKIP = 0.05;
/** Give up waiting for metadata / a seek after this long. */
const METADATA_TIMEOUT_MS = 20_000;
const SEEK_TIMEOUT_MS = 10_000;
/** JPEG quality of the extracted frame. Kept high — resizeImageToBlob re-encodes. */
const FRAME_QUALITY = 0.92;

export class VideoFrameError extends Error {}

export interface ExtractedFrame {
  /** Object URL for the preview <img>. Caller must revoke it (revokeFrames). */
  previewUrl: string;
  blob: Blob;
  /** Timestamp in the source video, seconds. */
  time: number;
}

export interface ExtractOptions {
  count?: number;
  /**
   * Sub-step phase, 0–1. Pass 0 for the first pass; 0.5 samples exactly halfway
   * between the previous pass's timestamps ("extract more").
   */
  phase?: number;
  onProgress?: (done: number, total: number) => void;
}

function waitForEvent(el: HTMLElement, event: string, timeoutMs: number, what: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new VideoFrameError(what));
    }, timeoutMs);
    const onOk = () => { cleanup(); resolve(); };
    const onErr = () => { cleanup(); reject(new VideoFrameError("לא ניתן לקרוא את הסרטון הזה בדפדפן — נסה MP4")); };
    function cleanup() {
      clearTimeout(timer);
      el.removeEventListener(event, onOk);
      el.removeEventListener("error", onErr);
    }
    el.addEventListener(event, onOk, { once: true });
    el.addEventListener("error", onErr, { once: true });
  });
}

/**
 * Extract evenly-spaced frames from a video File, entirely in the browser.
 * Throws VideoFrameError (Hebrew message) if the browser can't decode it.
 */
export async function extractFrames(file: File, opts: ExtractOptions = {}): Promise<ExtractedFrame[]> {
  const count = opts.count ?? FRAME_COUNT;
  const phase = opts.phase ?? 0;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  // Local blob URL — no network, no CORS taint, so canvas stays readable.
  video.src = objectUrl;

  const frames: ExtractedFrame[] = [];
  let canvas: HTMLCanvasElement | null = null;

  try {
    await waitForEvent(video, "loadedmetadata", METADATA_TIMEOUT_MS,
      "הדפדפן לא הצליח לטעון את הסרטון (ייתכן קודק לא נתמך) — נסה MP4");

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new VideoFrameError("לא ניתן לקרוא את אורך הסרטון בדפדפן — נסה MP4");
    }
    if (!video.videoWidth || !video.videoHeight) {
      throw new VideoFrameError("לא ניתן לפענח את תמונת הסרטון בדפדפן — נסה MP4");
    }

    canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new VideoFrameError("הדפדפן לא תומך ב-canvas — לא ניתן לחלץ תמונות");

    const start = duration * EDGE_SKIP;
    const end = duration * (1 - EDGE_SKIP);
    const span = Math.max(end - start, 0);
    const step = span / count;

    for (let i = 0; i < count; i++) {
      // Centre of each slot, shifted by `phase` so a second pass interleaves.
      const t = Math.min(start + (i + 0.5 + phase) * step, Math.max(end - 0.001, 0));
      try {
        video.currentTime = t;
        await waitForEvent(video, "seeked", SEEK_TIMEOUT_MS, "החילוץ נתקע בדילוג בסרטון");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((res) =>
          canvas!.toBlob(res, "image/jpeg", FRAME_QUALITY),
        );
        if (blob) {
          frames.push({ previewUrl: URL.createObjectURL(blob), blob, time: t });
        }
      } catch {
        // A single bad seek shouldn't kill the batch — skip this timestamp.
      }
      opts.onProgress?.(i + 1, count);
    }

    if (frames.length === 0) {
      throw new VideoFrameError("לא הצלחנו לחלץ אף תמונה מהסרטון — ייתכן שהקודק לא נתמך. נסה MP4");
    }
    return frames;
  } finally {
    // Always release the decoder + the blob URL, even on failure — large videos
    // otherwise leak hundreds of MB per attempt.
    video.pause?.();
    video.removeAttribute("src");
    video.load?.();
    URL.revokeObjectURL(objectUrl);
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

/** Convert picked frames into Files for the existing image-upload path. */
export function framesToFiles(frames: ExtractedFrame[], baseName: string): File[] {
  return frames.map((f) => {
    const stamp = Math.round(f.time).toString().padStart(4, "0");
    return new File([f.blob], `${baseName}-${stamp}s.jpg`, { type: "image/jpeg" });
  });
}

/** Revoke preview object URLs — call when clearing or replacing the frame grid. */
export function revokeFrames(frames: ExtractedFrame[]): void {
  for (const f of frames) URL.revokeObjectURL(f.previewUrl);
}
