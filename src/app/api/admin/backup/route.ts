import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import defaultTranslations from "@/src/lib/translations.json";

export const dynamic = "force-dynamic";

const KV_KEY = "site_translations";

/**
 * GET /api/admin/backup
 * Returns the current live translations (KV merged with defaults) as a
 * downloadable JSON file. Used by the content editor's "Download Backup" button.
 */
export async function GET() {
  try {
    const stored = await kv.get(KV_KEY);
    const data = stored
      ? { ...defaultTranslations, ...(stored as object) }
      : defaultTranslations;

    const json = JSON.stringify(data, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="binyan-eitan-translations-${timestamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[admin/backup] Error:", err);
    // Fallback: return defaults
    return new NextResponse(JSON.stringify(defaultTranslations, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="binyan-eitan-translations-defaults.json"`,
        "Cache-Control": "no-store",
      },
    });
  }
}
