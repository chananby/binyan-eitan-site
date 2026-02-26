import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KV_KEY = "site_translations";

export async function GET() {
  try {
    console.log("[debug-inspect] Inspecting KV contents...");
    
    const stored = await kv.get(KV_KEY);
    
    if (!stored) {
      console.log("[debug-inspect] KV is completely empty");
      return NextResponse.json({
        ok: false,
        message: "KV is empty",
        data: null,
      });
    }
    
    // Deep inspection
    const inspection: Record<string, any> = {};
    
    for (const section of Object.keys(stored).slice(0, 3)) {
      const sectionData = (stored as any)[section];
      inspection[section] = {
        hasEn: Boolean(sectionData?.en),
        haHe: Boolean(sectionData?.he),
        enKeys: Object.keys(sectionData?.en ?? {}).length,
        heKeys: Object.keys(sectionData?.he ?? {}).length,
        sample: {
          en: {},
          he: {},
        },
      };
      
      // Get first 3 key-value pairs
      if (sectionData?.en) {
        const enKeys = Object.keys(sectionData.en).slice(0, 3);
        for (const key of enKeys) {
          const val = sectionData.en[key];
          inspection[section].sample.en[key] = {
            value: val ? val.substring(0, 50) : "EMPTY",
            isEmpty: !val || val === "",
            isNull: val === null,
            type: typeof val,
          };
        }
      }
      
      if (sectionData?.he) {
        const heKeys = Object.keys(sectionData.he).slice(0, 3);
        for (const key of heKeys) {
          const val = sectionData.he[key];
          inspection[section].sample.he[key] = {
            value: val ? val.substring(0, 50) : "EMPTY",
            isEmpty: !val || val === "",
            isNull: val === null,
            type: typeof val,
          };
        }
      }
    }
    
    console.log("[debug-inspect] Inspection result:", JSON.stringify(inspection, null, 2));
    
    return NextResponse.json({
      ok: true,
      message: "KV inspection complete",
      inspection,
      totalSections: Object.keys(stored).length,
    });
  } catch (err) {
    console.error("[debug-inspect] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Inspection failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
