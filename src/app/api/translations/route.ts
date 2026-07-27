import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { revalidatePath, revalidateTag } from "next/cache";
import defaultTranslations from "@/src/lib/translations.json";
import { isAdminAuthedFromRequest, verifyInternalToken } from "../../../lib/admin-auth";

const INTERNAL_COOKIE = "be_internal_token";

function isContentEditorAuthorized(req: NextRequest): boolean {
  if (isAdminAuthedFromRequest(req)) return true;
  const t = req.cookies.get(INTERNAL_COOKIE)?.value;
  return !!t && verifyInternalToken(t);
}

// Always run fresh — never serve a cached response from Next.js or CDN
export const dynamic = "force-dynamic";

const KV_KEY     = "site_translations";
const KV_VERSION = "site_translations_version";   // monotonically-increasing int
const NO_CACHE   = { "Cache-Control": "no-store, no-cache, must-revalidate" };
// CDN edge cache for the read path only (same policy as /api/gallery). Collapses
// the every-tab poll into ~one function invocation per 60s per region, killing
// the 158KB deep-merge CPU cost on repeat reads. Editor saves still land within
// ≤60s: same-origin tabs update instantly via BroadcastChannel, and the s-maxage
// window bounds propagation for everyone else; PUT/errors stay NO_CACHE.
const CDN_CACHE  = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

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

async function readVersion(): Promise<number> {
  try {
    const v = await kv.get(KV_VERSION);
    if (typeof v === "number") return v;
    if (typeof v === "string") { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; }
    return 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const [stored, version] = await Promise.all([kv.get(KV_KEY), readVersion()]);
    const merged = stored
      ? deepMerge(
          defaultTranslations as unknown as Record<string, unknown>,
          stored as Record<string, unknown>
        )
      : (defaultTranslations as unknown as Record<string, unknown>);
    // _version is a meta field — clients use it for optimistic-concurrency on PUT.
    return NextResponse.json({ ...merged, _version: version }, { headers: CDN_CACHE });
  } catch (err) {
    console.error("[translations/GET] KV unavailable:", err);
    return NextResponse.json({ ...defaultTranslations, _version: 0 }, { headers: NO_CACHE });
  }
}

export async function PUT(req: NextRequest) {
  if (!isContentEditorAuthorized(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_CACHE }
    );
  }
  try {
    const body = await req.json();

    // Optimistic concurrency: if caller provides _expectedVersion, it must
    // match the live one. Mismatch → 409 + current state so the client can
    // prompt the user to reload before retrying.
    const expectedVersion = typeof body?._expectedVersion === "number" ? body._expectedVersion : null;
    const currentVersion = await readVersion();
    if (expectedVersion !== null && expectedVersion !== currentVersion) {
      const current = await kv.get(KV_KEY);
      const merged = current
        ? deepMerge(
            defaultTranslations as unknown as Record<string, unknown>,
            current as Record<string, unknown>
          )
        : (defaultTranslations as unknown as Record<string, unknown>);
      return NextResponse.json(
        {
          error: "version_conflict",
          message: "מישהו אחר עדכן את התוכן מאז שטענת את הדף",
          currentVersion,
          current: { ...merged, _version: currentVersion },
        },
        { status: 409, headers: NO_CACHE }
      );
    }

    // Strip the meta fields before persisting — they aren't part of the data.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _expectedVersion, _version, ...persistable } = body ?? {};

    await kv.set(KV_KEY, persistable);

    const verified = await kv.get(KV_KEY);
    if (!verified) {
      return NextResponse.json(
        { error: "KV write appeared to succeed but read-back returned empty. Check KV connection." },
        { status: 500, headers: NO_CACHE }
      );
    }

    const nextVersion = currentVersion + 1;
    await kv.set(KV_VERSION, nextVersion);

    try {
      revalidateTag("translations", "max");
      for (const path of REVALIDATE_PATHS) revalidatePath(path);
    } catch {
      // Not fatal — client-side BroadcastChannel sync handles live users
    }

    return NextResponse.json({ ok: true, saved: true, version: nextVersion }, { headers: NO_CACHE });
  } catch (err: any) {
    console.error("[translations/PUT] Save failed:", err.message);
    return NextResponse.json(
      { error: err.message ?? "KV save failed" },
      { status: 500, headers: NO_CACHE }
    );
  }
}

// Fallback for environments that block PUT
export async function POST(req: NextRequest) {
  return PUT(req);
}
