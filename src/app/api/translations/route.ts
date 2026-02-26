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
    console.log("[translations/GET] Stored data sections:", Object.keys(stored).length);
    
    // Deep-merge: KV values override defaults, but empty strings fallback to defaults
    const merged = deepMerge(defaultTranslations, stored);
    
    console.log("[translations/GET] Merged data has", Object.keys(merged).length, "sections");
    console.log("[translations/GET] ✓ Returning merged data (empty KV values were replaced with defaults)");
    
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
    const overrideValue = override[key];
    const baseValue = base[key];
    
    // Skip empty strings, null, or undefined - they should not overwrite defaults
    if (overrideValue === "" || overrideValue === null || overrideValue === undefined) {
      console.log(`[deepMerge] Skipping empty/null value for key "${key}", keeping default`);
      continue;
    }
    
    // If both are objects (and not arrays), recurse into them
    if (
      overrideValue !== null &&
      typeof overrideValue === "object" &&
      !Array.isArray(overrideValue) &&
      baseValue !== null &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      result[key] = deepMerge(baseValue, overrideValue);
    } else {
      // For non-object values, use the override (we already filtered out empty/null above)
      result[key] = overrideValue;
    }
  }
  
  return result;
}
