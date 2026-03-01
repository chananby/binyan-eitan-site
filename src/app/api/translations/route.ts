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
  "/en/faq", "/he/faq",
  "/en/projects", "/he/projects",
  "/en/legal", "/he/legal",
  "/en/change-order", "/he/change-order",
  "/en/building-from-afar", "/he/building-from-afar",
  "/en/behind-the-walls", "/he/behind-the-walls",
];

export async function GET() {
  try {
    const stored = await kv.get(KV_KEY);
    if (!stored) return NextResponse.json(defaultTranslations, { headers: NO_CACHE });
    return NextResponse.json(stored, { headers: NO_CACHE });
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
