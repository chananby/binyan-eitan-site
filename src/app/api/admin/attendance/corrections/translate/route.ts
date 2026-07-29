/**
 * POST /api/admin/attendance/corrections/translate
 *
 * Translates a single correction-request reason into Hebrew on demand, so the
 * admin can read a note a worker wrote in their own language. Admin OR foreman
 * (same audience as the corrections panel). Nothing is stored — pure passthrough
 * to the shared Anthropic helper.
 *
 * Body: { text: string, sourceLangLabel?: string }
 * Reply: { translation: string } | { error }
 */
import { NextRequest, NextResponse } from "next/server";
import { isAuthedFromRequest } from "../../../../../../lib/admin-auth";
import { translateToHebrew } from "../../../../../../lib/translate";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: string; sourceLangLabel?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "אין טקסט לתרגום" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "הטקסט ארוך מדי" }, { status: 400 });

  try {
    const translation = await translateToHebrew(text, body.sourceLangLabel?.trim() || undefined);
    return NextResponse.json({ translation });
  } catch (e) {
    console.error("[corrections/translate]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "התרגום נכשל, נסה שוב" }, { status: 502 });
  }
}
