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

/**
 * Every "the browser can't decode this" path shows THIS message — specific and
 * actionable, not a generic error. By far the most common cause is an iPhone
 * .MOV/HEVC, which Chrome/Firefox on desktop won't decode, so the message names
 * the likely cause and gives the exact iOS setting that makes the phone hand
 * over an H.264/MP4 copy instead.
 */
const CODEC_HELP =
  "לא ניתן לקרוא את הסרטון הזה בדפדפן (כנראה HEVC מאייפון).\n" +
  "פתרון: הגדרות ← תמונות ← העברה למחשב ← 'אוטומטי', והעבר את הסרטון שוב.";

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
    const onErr = () => { cleanup(); reject(new VideoFrameError(CODEC_HELP)); };
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
      CODEC_HELP);

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new VideoFrameError(CODEC_HELP);
    }
    if (!video.videoWidth || !video.videoHeight) {
      throw new VideoFrameError(CODEC_HELP);
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
      throw new VideoFrameError(CODEC_HELP);
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

// ── Fallback path: ffmpeg.wasm ──────────────────────────────────────────────
// The fast path above only works for codecs the BROWSER can decode. Chanan
// shoots on an iPhone (HEVC), which desktop Chrome/Firefox refuse — so when the
// fast path fails we decode with ffmpeg.wasm instead, and he can just drag the
// file in without changing any phone setting.
//
// ffmpeg.wasm is ~31 MB, so it is loaded via DYNAMIC IMPORT and its core is
// fetched from the CDN ON FIRST FAILURE ONLY — a normal MP4 never touches it,
// and none of it is in the initial bundle.
//
// We deliberately use the SINGLE-THREADED core: it contains zero
// SharedArrayBuffer/pthread references (verified), so NO COOP/COEP headers are
// required and the public site's headers stay untouched. (@ffmpeg/core-mt would
// have needed cross-origin isolation site-wide.)
// EXACT version pin — never "latest". An upstream release must not be able to
// change what we load and break extraction without us shipping anything.
const FFMPEG_CORE_VERSION = "0.12.10";
const FFMPEG_CDN = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

const FFMPEG_FAILED =
  "גם הפענוח המורחב נכשל — לא הצלחנו לקרוא את הסרטון.\n" +
  "נסה סרטון אחר, או שלח אותו לעצמך בוואטסאפ והעלה את הקובץ שהתקבל (וואטסאפ ממיר ל-MP4).";

/** Distinct from a decode failure: the engine itself never arrived. */
const FFMPEG_CDN_DOWN =
  "לא הצלחנו להוריד את רכיב הפענוח מהאינטרנט (ייתכן שאין חיבור או שהשירות זמנית לא זמין).\n" +
  "בדוק את החיבור ונסה שוב, או העלה סרטון MP4 שהדפדפן קורא ישירות.";

/** Minimal surface of the ffmpeg.wasm instance we actually use. */
interface FFmpegLike {
  on(event: "log", cb: (p: { message: string }) => void): void;
  load(cfg: { coreURL: string; wasmURL: string }): Promise<unknown>;
  writeFile(name: string, data: Uint8Array): Promise<unknown>;
  exec(args: string[]): Promise<unknown>;
  readFile(name: string): Promise<unknown>;
  deleteFile(name: string): Promise<unknown>;
  terminate(): void;
}

/**
 * Extract frames using ffmpeg.wasm. Same timestamps/logic as the fast path.
 * Only called after the browser-native attempt has failed.
 */
export async function extractFramesFfmpeg(file: File, opts: ExtractOptions = {}): Promise<ExtractedFrame[]> {
  const count = opts.count ?? FRAME_COUNT;
  const phase = opts.phase ?? 0;

  let ffmpeg: FFmpegLike | null = null;

  const frames: ExtractedFrame[] = [];
  const inputName = `input.${(file.name.split(".").pop() || "mp4").slice(0, 5)}`;

  try {
    let toBlobURL: (url: string, mime: string) => Promise<string>;
    try {
      const [mod, util] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      ffmpeg = new mod.FFmpeg() as unknown as FFmpegLike;
      toBlobURL = util.toBlobURL;
    } catch {
      throw new VideoFrameError(FFMPEG_CDN_DOWN);
    }

    // ffmpeg prints "Duration: HH:MM:SS.ss" to its log — the only way to learn
    // the length, and we need it to space the timestamps evenly.
    let duration = 0;
    ffmpeg.on("log", ({ message }) => {
      const m = message.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (m) duration = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    });

    // Fetching the 31 MB core is the one step that depends on the network.
    // A failure here is NOT a codec problem — say so plainly instead of
    // reporting "the video can't be read".
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.wasm`, "application/wasm"),
      });
    } catch {
      throw new VideoFrameError(FFMPEG_CDN_DOWN);
    }

    await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    // Probe: no output file, so ffmpeg exits non-zero — we only want the log.
    try { await ffmpeg.exec(["-i", inputName]); } catch { /* expected */ }
    if (!Number.isFinite(duration) || duration <= 0) throw new VideoFrameError(FFMPEG_FAILED);

    const start = duration * EDGE_SKIP;
    const end = duration * (1 - EDGE_SKIP);
    const step = Math.max(end - start, 0) / count;

    for (let i = 0; i < count; i++) {
      const t = Math.min(start + (i + 0.5 + phase) * step, Math.max(end - 0.001, 0));
      const out = `f${i}.jpg`;
      try {
        // -ss BEFORE -i = input seeking: ffmpeg jumps near the keyframe instead
        // of decoding the whole file per frame. Essential for long videos.
        await ffmpeg.exec(["-ss", t.toFixed(3), "-i", inputName, "-frames:v", "1", "-q:v", "3", "-y", out]);
        const data = (await ffmpeg.readFile(out)) as Uint8Array;
        if (data && data.length) {
          const blob = new Blob([new Uint8Array(data)], { type: "image/jpeg" });
          frames.push({ previewUrl: URL.createObjectURL(blob), blob, time: t });
        }
        await ffmpeg.deleteFile(out).catch(() => {});
      } catch {
        // Skip this timestamp; a single bad frame must not kill the batch.
      }
      opts.onProgress?.(i + 1, count);
    }

    if (frames.length === 0) throw new VideoFrameError(FFMPEG_FAILED);
    return frames;
  } catch (e) {
    if (e instanceof VideoFrameError) throw e;
    throw new VideoFrameError(FFMPEG_FAILED);
  } finally {
    // Free the in-memory FS copy and tear the worker + wasm heap down, so a
    // 300 MB video doesn't stay resident after extraction.
    try { await ffmpeg?.deleteFile(inputName); } catch { /* ignore */ }
    try { ffmpeg?.terminate(); } catch { /* ignore */ }
    ffmpeg = null;
  }
}

/**
 * Fast path first, ffmpeg.wasm only if the browser can't decode the file.
 * `onFallback` fires just before the heavy path starts, so the UI can explain
 * the wait instead of appearing to hang.
 */
export async function extractFramesAuto(
  file: File,
  opts: ExtractOptions & { onFallback?: () => void } = {},
): Promise<ExtractedFrame[]> {
  try {
    return await extractFrames(file, opts);
  } catch {
    opts.onFallback?.();
    return await extractFramesFfmpeg(file, opts);
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
