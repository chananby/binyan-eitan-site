import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import defaultTranslations from "@/src/lib/translations.json";

const KV_KEY = "site_translations";

export async function GET() {
  try {
    const stored = await kv.get<typeof defaultTranslations>(KV_KEY);
    if (!stored) return NextResponse.json(defaultTranslations);
    // Deep-merge: KV values override defaults, missing keys fall back to defaults
    const merged = deepMerge(defaultTranslations, stored);
    return NextResponse.json(merged);
  } catch {
    return NextResponse.json(defaultTranslations);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const merged = deepMerge(defaultTranslations, body);
    await kv.set(KV_KEY, merged);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("translations PUT failed", err);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
}

function deepMerge(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...base };
  for (const key of Object.keys(override)) {
    if (
      override[key] !== null &&
      typeof override[key] === "object" &&
      !Array.isArray(override[key]) &&
      typeof base[key] === "object" &&
      base[key] !== null
    ) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}
