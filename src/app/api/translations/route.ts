import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { revalidatePath, revalidateTag } from "next/cache";
import defaultTranslations from "@/src/lib/translations.json";

// Always run fresh — never serve a cached response from Next.js or CDN
export const dynamic = "force-dynamic";

const KV_KEY = "site_translations";
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

const REVALIDATE_PATHS = [
  "/en", "/he",
  "/en/about", "/he/about",
  "/en/expertise", "/he/expertise",
  "/en/expertise/g1-contractor-certification", "/he/expertise/g1-contractor-certification",
  "/en/expertise/building-from-abroad", "/he/expertise/building-from-abroad",
  "/en/expertise/behind-the-walls", "/he/expertise/behind-the-walls",
  "/en/expertise/building-private-home", "/he/expertise/building-private-home",
  "/en/expertise/foundation-reinforcement", "/he/expertise/foundation-reinforcement",
  "/en/expertise/israeli-workforce", "/he/expertise/israeli-workforce",
  "/en/expertise/renovation-budget-planning", "/he/expertise/renovation-budget-planning",
  "/en/expertise/choosing-a-contractor", "/he/expertise/choosing-a-contractor",
  "/en/expertise/renovating-while-living", "/he/expertise/renovating-while-living",
  "/en/legal", "/he/legal",
  "/en/change-order", "/he/change-order",
];

/** Deep-merge defaults with KV overrides.
 *  - Objects: recursively merged so new keys added to defaults are never lost
 *  - Arrays:  defaults win when longer (new articles/faqs added to source always show)
 *  - Scalars: KV wins (editor changes are preserved)
 */
function deepMerge(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(overrides)) {
    const dv = defaults[key];
    const ov = overrides[key];
    if (Array.isArray(ov) && Array.isArray(dv)) {
      result[key] = dv.length > ov.length ? dv : ov;
    } else if (
      ov && typeof ov === "object" && !Array.isArray(ov) &&
      dv && typeof dv === "object" && !Array.isArray(dv)
    ) {
      result[key] = deepMerge(
        dv as Record<string, unknown>,
        ov as Record<string, unknown>
      );
    } else {
      result[key] = ov;
    }
  }
  return result;
}

export async function GET() {
  try {
    const stored = await kv.get(KV_KEY);
    if (!stored) return NextResponse.json(defaultTranslations, { headers: NO_CACHE });
    const merged = deepMerge(
      defaultTranslations as unknown as Record<string, unknown>,
      stored as Record<string, unknown>
    );
    return NextResponse.json(merged, { headers: NO_CACHE });
  } catch (err) {
    console.error("[translations/GET] KV unavailable:", err);
    return NextResponse.json(defaultTranslations, { headers: NO_CACHE });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // Persist to KV
    await kv.set(KV_KEY, body);

    // Verify the write succeeded with a read-back
    const verified = await kv.get(KV_KEY);
    if (!verified) {
      return NextResponse.json(
        { error: "KV write appeared to succeed but read-back returned empty. Check KV connection." },
        { status: 500, headers: NO_CACHE }
      );
    }

    // Revalidate all static page caches atomically with the save
    try {
      revalidateTag("translations");
      for (const path of REVALIDATE_PATHS) {
        revalidatePath(path);
      }
    } catch {
      // Not fatal — client-side BroadcastChannel sync handles live users
    }

    return NextResponse.json({ ok: true, saved: true }, { headers: NO_CACHE });
  } catch (err: any) {
    console.error("[translations/PUT] Save failed:", err.message);
    return NextResponse.json(
      { error: err.message ?? "KV save failed" },
      { status: 500, headers: NO_CACHE }
    );
  }
}

// Fallback for environments that block PUT
export async function POST(req: Request) {
  return PUT(req);
}
