/**
 * GET /api/gallery
 *
 * Fetches images from the Cloudinary "portfolio" folder and returns them
 * grouped by category, parsed from the filename convention:
 *
 *   category_action_number[.ext]
 *
 * Examples:
 *   bathroom_before_01   → category: "bathroom", action: "before",  num: "01"
 *   bathroom_after_01    → category: "bathroom", action: "after",   num: "01"
 *   kitchen_progress_02  → category: "kitchen",  action: "progress", num: "02"
 *   living-room_final_03 → category: "living-room", action: "final", num: "03"
 *
 * The category is the first underscore-delimited segment.
 * The number is the last underscore-delimited segment.
 * Everything in between is the action (supports multi-word actions like "during_work").
 *
 * Response shape:
 * {
 *   "bathroom": [
 *     { "url": "https://res.cloudinary.com/...", "thumb": "...", "action": "before", "num": "01", "publicId": "portfolio/bathroom_before_01" },
 *     ...
 *   ],
 *   "kitchen": [ ... ]
 * }
 *
 * Categories are sorted alphabetically; images within each category are sorted
 * by action then by number.
 *
 * Fetching strategy:
 *   - Primary:  folder:portfolio
 *   - Fallback: tag:website  (if you prefer tagging over folder structure)
 *   Change CLOUDINARY_EXPRESSION below to switch.
 *
 * Caching: 60 s via Next.js fetch cache + Cache-Control header.
 */

import { NextResponse } from "next/server";

export const revalidate = 60;

const CLOUDINARY_EXPRESSION = "folder:portfolio";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GalleryImage {
  publicId: string;
  url: string;
  thumb: string;
  action: string;
  num: string;
}

export type GalleryByCategory = Record<string, GalleryImage[]>;

// ── Cloudinary helpers ────────────────────────────────────────────────────────

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
}

interface CloudinarySearchResponse {
  resources: CloudinaryResource[];
  next_cursor?: string;
}

function deliveryUrl(publicId: string, transforms = "f_auto,q_auto,w_1920"): string {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  return `https://res.cloudinary.com/${cloud}/image/upload/${transforms}/${publicId}`;
}

async function fetchPage(
  auth: string,
  cloud: string,
  cursor?: string
): Promise<CloudinarySearchResponse> {
  const body: Record<string, unknown> = {
    expression: CLOUDINARY_EXPRESSION,
    sort_by: [{ public_id: "asc" }],
    max_results: 500,
  };
  if (cursor) body.next_cursor = cursor;

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/resources/search`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

// ── Filename parser ───────────────────────────────────────────────────────────
// Input:  "portfolio/bathroom_before_01"  or  "bathroom_before_01"
// Output: { category: "bathroom", action: "before", num: "01" } | null

function parseFilename(
  publicId: string
): { category: string; action: string; num: string } | null {
  // Take only the final path segment, strip extension
  const filename = publicId.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";

  const parts = filename.split("_");
  if (parts.length < 3) return null; // needs at least category_action_number

  const category = parts[0];
  const num      = parts[parts.length - 1];
  const action   = parts.slice(1, -1).join("_"); // everything between

  if (!category || !num || !action) return null;
  return { category, action, num };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const cloud     = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary credentials not configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)" },
      { status: 500 }
    );
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  // Paginate through all results
  let all: CloudinaryResource[] = [];
  let cursor: string | undefined;
  try {
    do {
      const page = await fetchPage(auth, cloud, cursor);
      all = all.concat(page.resources);
      cursor = page.next_cursor;
    } while (cursor);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/gallery]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Group by category
  const grouped: Record<string, GalleryImage[]> = {};

  for (const resource of all) {
    const parsed = parseFilename(resource.public_id);
    if (!parsed) continue; // skip files that don't match the convention

    const { category, action, num } = parsed;

    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({
      publicId: resource.public_id,
      url:      deliveryUrl(resource.public_id),
      thumb:    deliveryUrl(resource.public_id, "f_auto,q_auto,w_600,c_fill,g_auto"),
      action,
      num,
    });
  }

  // Sort within each category: by action asc, then num asc
  for (const images of Object.values(grouped)) {
    images.sort((a, b) => {
      if (a.action !== b.action) return a.action.localeCompare(b.action);
      return a.num.localeCompare(b.num, undefined, { numeric: true });
    });
  }

  // Return categories sorted alphabetically
  const sorted: GalleryByCategory = Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  );

  return NextResponse.json(sorted, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
