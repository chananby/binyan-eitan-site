import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// PATCH — retroactive edit of an attendance record (action, project, display time)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; project_id?: string | null; timestamp_label?: string; status?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const update: Record<string, unknown> = {};
  if (body.action !== undefined) {
    if (!["כניסה", "יציאה", "in", "out"].includes(body.action)) {
      return NextResponse.json({ error: "פעולה לא תקינה" }, { status: 400 });
    }
    update.action = body.action;
  }
  if (body.project_id !== undefined) update.project_id = body.project_id || null;
  if (body.timestamp_label !== undefined) update.timestamp_label = body.timestamp_label?.trim() || null;
  if (body.status !== undefined) {
    if (!["approved", "rejected", "pending"].includes(body.status)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (!Object.keys(update).length) return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("attendance")
    .update(update)
    .eq("id", params.id)
    .select("id, action, timestamp_label, recorded_at, project_id, status")
    .single();

  if (error) {
    console.error("[admin/attendance PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ record: data });
}
