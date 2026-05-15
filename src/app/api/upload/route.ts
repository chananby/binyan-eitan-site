import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "../../../lib/rate-limit";

// Node.js runtime — edge has body-size limits that break image uploads
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Whitelist matches site usage: change-order site photos, signature DataURLs.
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const EXT_FROM_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export async function POST(req: NextRequest) {
  // Same-origin guard — blocks cross-origin scripted POSTs.
  // ChangeOrderForm (public) and admin/internal forms all submit from the same host.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Rate limit per IP — protects against bulk-upload DoS.
  const rl = checkRateLimit(`${clientIp(req)}:upload`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured" },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (typeof file.size === "number" && file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 }
    );
  }

  const declaredType = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(declaredType)) {
    return NextResponse.json(
      { error: `Unsupported file type${declaredType ? `: ${declaredType}` : ""}` },
      { status: 415 }
    );
  }

  // Derive extension from MIME (not from user-supplied filename) — prevents
  // path traversal / extension spoofing via crafted file names.
  const ext = EXT_FROM_MIME[declaredType] ?? "bin";
  const random = Math.random().toString(36).slice(2, 10);
  const blobName = `change-orders/${Date.now()}-${random}.${ext}`;

  try {
    const blob = await put(blobName, file.stream(), {
      access: "public",
      contentType: declaredType,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
