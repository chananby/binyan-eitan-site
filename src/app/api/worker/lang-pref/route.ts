/**
 * POST /api/worker/lang-pref — persist the worker's language choice.
 *
 * Body: { language: "he" | "en" | "ru" | "si" | "zh" | "hi" }
 *
 * Identity comes from the signed worker cookie issued by /api/worker/identify
 * — there is no staff_id in the body, so a worker can only set their own
 * preference. The list of valid codes mirrors SUPPORTED_LANGS in
 * src/app/components/attendance/i18n.ts; if those ever diverge, the validator
 * here is the gatekeeper and the request will 400.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { getWorkerStaffIdFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

const VALID_LANGS = ["he", "en", "ru", "si", "zh", "hi"] as const;

export async function POST(req: NextRequest) {
  const staffId = getWorkerStaffIdFromRequest(req);
  if (!staffId) {
    return NextResponse.json({ error: "יש להזדהות מחדש" }, { status: 401 });
  }

  let body: { language?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const language = body.language?.trim();
  if (!language || !(VALID_LANGS as readonly string[]).includes(language)) {
    return NextResponse.json({ error: "language not supported" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("staff")
    .update({ language })
    .eq("id", staffId)
    .is("deleted_at", null);

  if (error) {
    console.error("[worker/lang-pref]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, language });
}
