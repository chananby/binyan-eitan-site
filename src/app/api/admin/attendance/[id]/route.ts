import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase";
import { israelWallClockToISO } from "../../../../../lib/israel-time";
import {
  isAdminAuthedFromRequest,
  isAuthedFromRequest,
  getRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../../lib/admin-auth";

export const runtime = "nodejs";

// PATCH — retroactive edit of an attendance record.
// Admin: full edit. Foreman: status only (approve/reject), scoped to their projects.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; project_id?: string | null; timestamp_label?: string; status?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const role = getRoleFromRequest(req);
  const supabase = createServerClient();

  // Foreman path: status-only on records belonging to their projects
  if (role === "foreman") {
    const onlyStatus = body.status !== undefined
      && body.action === undefined
      && body.project_id === undefined
      && body.timestamp_label === undefined;
    if (!onlyStatus) return NextResponse.json({ error: "מנהל עבודה יכול לאשר או לדחות בלבד" }, { status: 403 });

    if (!["approved", "rejected"].includes(body.status!)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }

    const staffId = getForemanStaffIdFromRequest(req);
    if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: record, error: recErr } = await supabase
      .from("attendance")
      .select("id, project_id")
      .eq("id", params.id)
      .maybeSingle();
    if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
    if (!record.project_id) return NextResponse.json({ error: "אין פרויקט משויך לרשומה" }, { status: 403 });

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("foreman_id")
      .eq("id", record.project_id)
      .maybeSingle();
    if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });
    if (!project || project.foreman_id !== staffId) {
      return NextResponse.json({ error: "אין הרשאה לרשומה הזו" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("attendance")
      .update({ status: body.status })
      .eq("id", params.id)
      .select("id, status")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ record: data });
  }

  // Admin path: full edit (existing behavior)
  if (!isAdminAuthedFromRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const update: Record<string, unknown> = {};
  if (body.action !== undefined) {
    if (!["כניסה", "יציאה", "in", "out"].includes(body.action)) {
      return NextResponse.json({ error: "פעולה לא תקינה" }, { status: 400 });
    }
    update.action = body.action;
  }
  if (body.project_id !== undefined) update.project_id = body.project_id || null;
  if (body.timestamp_label !== undefined) {
    const trimmed = body.timestamp_label?.trim() || null;
    update.timestamp_label = trimmed;
    if (trimmed) {
      const parts = trimmed.replace(",", "").trim().split(/\s+/);
      if (parts.length >= 2) {
        const [d2, m2, y2] = parts[0].split(".");
        const [hh, mm]     = parts[1].split(":");
        if (d2 && m2 && y2 && hh && mm) {
          const ymd = `${y2}-${m2.padStart(2,"0")}-${d2.padStart(2,"0")}`;
          const hm  = `${hh.padStart(2,"0")}:${mm.padStart(2,"0")}`;
          try {
            update.clock_at = israelWallClockToISO(ymd, hm);
          } catch { /* invalid date — skip update */ }
        }
      }
    } else {
      update.clock_at = null;
    }
  }
  if (body.status !== undefined) {
    if (!["approved", "rejected", "pending"].includes(body.status)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (!Object.keys(update).length) return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });

  const { data, error } = await supabase
    .from("attendance")
    .update(update)
    .eq("id", params.id)
    .select("id, action, timestamp_label, clock_at, recorded_at, project_id, status")
    .single();

  if (error) {
    console.error("[admin/attendance PATCH]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ record: data });
}
