import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { revalidateTag } from "next/cache";
import defaultTranslations from "@/src/lib/translations.json";

const KV_KEY = "site_translations";

export async function GET() {
  try {
    console.log(`[translations/GET] Fetching from KV key: "${KV_KEY}"`);
    const stored = await kv.get<typeof defaultTranslations>(KV_KEY);
    
    if (!stored) {
      console.log("[translations/GET] KV is empty, returning defaults from translations.json");
      return NextResponse.json(defaultTranslations);
    }
    
    console.log("[translations/GET] Found data in KV, merging with defaults");
    // Deep-merge: KV values override defaults, missing keys fall back to defaults
    const merged = deepMerge(defaultTranslations, stored);
    console.log("[translations/GET] Merged data has", Object.keys(merged).length, "sections");
    return NextResponse.json(merged);
  } catch (err) {
    console.error("[translations/GET] Error:", err);
    return NextResponse.json(defaultTranslations);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const merged = deepMerge(defaultTranslations, body);
    await kv.set(KV_KEY, merged);
    
    // Trigger revalidation
    try {
      revalidateTag("translations");
    } catch {
      // Revalidation may not be available in all environments
    }
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("translations PUT failed", err);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
}

function deepMerge(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...base };
  for (const key of Object.keys(override)) {
    // Skip empty strings - they should not overwrite defaults
    if (override[key] === "") continue;
    
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
