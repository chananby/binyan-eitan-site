import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import defaultTranslations from "@/src/lib/translations.json";

const KV_KEY = "site_translations";

export async function GET() {
  try {
    console.log("[debug-seed] Starting force seed of translations.json into KV...");
    
    // Force the entire defaultTranslations into KV, overwriting anything there
    await kv.set(KV_KEY, defaultTranslations);
    
    console.log("[debug-seed] Successfully seeded KV with defaultTranslations");
    console.log("[debug-seed] KV now contains sections:", Object.keys(defaultTranslations).join(", "));
    
    // Verify what we just wrote
    const verified = await kv.get(KV_KEY);
    console.log("[debug-seed] Verification: Retrieved from KV has", verified ? Object.keys(verified).length : 0, "sections");
    
    return NextResponse.json({
      ok: true,
      message: "Force seeded translations.json into KV store",
      sectionsSeeded: Object.keys(defaultTranslations),
      totalSections: Object.keys(defaultTranslations).length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[debug-seed] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Seed failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
