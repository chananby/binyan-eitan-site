import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { revalidateTag } from "next/cache";
import defaultTranslations from "@/src/lib/translations.json";

// Always run fresh — never serve a cached response from Next.js or CDN
export const dynamic = "force-dynamic";

const KV_KEY = "site_translations";
const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

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
    await kv.set(KV_KEY, body);

    try {
      revalidateTag("translations");
    } catch {
      // tag not registered yet — safe to ignore
    }

    return NextResponse.json({ ok: true }, { headers: NO_CACHE });
  } catch (err: any) {
    console.error("[translations/PUT] Save failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_CACHE });
  }
}

// Fallback for environments that block PUT
export async function POST(req: Request) {
  return PUT(req);
}
