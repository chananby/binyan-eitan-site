import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import defaultTranslations from "@/src/lib/translations.json";

const KV_KEY = "site_translations";

function logTranslationValues(data: any, path = ""): void {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      logTranslationValues(value as Record<string, any>, `${path}${key}.`);
    } else {
      const displayValue = typeof value === "string" ? `"${value.substring(0, 50)}${value.length > 50 ? "..." : ""}"` : String(value);
      console.log(`[debug-seed] ${path}${key}: ${displayValue}`);
    }
  }
}

export async function GET() {
  try {
    console.log("[debug-seed] Starting force seed of translations.json into KV...");
    console.log("[debug-seed] Total sections in defaultTranslations:", Object.keys(defaultTranslations).length);
    
    // Log a sample of what we're about to write
    console.log("[debug-seed] ===== SAMPLE VALUES BEING SEEDED =====");
    for (const section of Object.keys(defaultTranslations).slice(0, 2)) {
      console.log(`[debug-seed] Section "${section}":`);
      logTranslationValues((defaultTranslations as any)[section], `  `);
    }
    console.log("[debug-seed] ===== END SAMPLE =====");
    
    // Force the entire defaultTranslations into KV, overwriting anything there
    await kv.set(KV_KEY, defaultTranslations);
    
    console.log("[debug-seed] Successfully seeded KV with defaultTranslations");
    console.log("[debug-seed] KV now contains sections:", Object.keys(defaultTranslations).join(", "));
    
    // Verify what we just wrote
    const verified = await kv.get(KV_KEY);
    if (verified) {
      console.log("[debug-seed] ✓ Verification: Retrieved from KV successfully");
      console.log("[debug-seed] ✓ Retrieved data sections:", Object.keys(verified).length);
      
      // Log the actual values from KV to confirm
      console.log("[debug-seed] ===== VERIFICATION: VALUES IN KV =====");
      for (const section of Object.keys(verified).slice(0, 2)) {
        console.log(`[debug-seed] Section "${section}":`);
        logTranslationValues(verified[section] as any, `  `);
      }
      console.log("[debug-seed] ===== END VERIFICATION =====");
    } else {
      console.error("[debug-seed] ✗ Verification failed: Could not retrieve data from KV");
    }
    
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
