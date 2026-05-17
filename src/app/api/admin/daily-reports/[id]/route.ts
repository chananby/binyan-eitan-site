import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAuthedFromRequest, getRoleFromRequest } from "../../../../../lib/admin-auth";
import { unauthorized, badRequest, forbidden, serverError } from "../../../../../lib/api-response";

export const runtime = "nodejs";

// PATCH — update an existing daily report.
// Foreman can only update today's log (enforced by checking the record's date).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthedFromRequest(req)) {
    return unauthorized();
  }

  let body: {
    summary?: string; weather?: string; special_events?: string;
    status?: string; subcontractor_count?: number;
  };
  try { body = await req.json(); }
  catch { return badRequest("Invalid JSON"); }

  const supabase = createServerClient();

  // For foreman, verify the record belongs to today before allowing edit
  if (getRoleFromRequest(req) === "foreman") {
    const { data: existing } = await supabase
      .from("daily_reports")
      .select("date")
      .eq("id", params.id)
      .maybeSingle();

    const today = new Date().toISOString().slice(0, 10);
    if (!existing || existing.date !== today) {
      return forbidden("ניתן לערוך יומן רק של היום");
    }
  }

  const update: Record<string, unknown> = {};
  if (body.summary            !== undefined) update.summary            = body.summary?.trim()        || null;
  if (body.weather            !== undefined) update.weather            = body.weather?.trim()        || null;
  if (body.special_events     !== undefined) update.special_events     = body.special_events?.trim() || null;
  if (body.status             !== undefined) update.status             = body.status;
  if (body.subcontractor_count !== undefined) update.subcontractor_count = body.subcontractor_count ?? 0;

  const { data, error } = await supabase
    .from("daily_reports")
    .update(update)
    .eq("id", params.id)
    .select("id, project_id, date, summary, weather, special_events, status, subcontractor_count")
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ report: data });
}
