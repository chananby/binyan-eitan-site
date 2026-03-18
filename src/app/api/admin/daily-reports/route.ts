import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

// GET — list daily reports, optionally filtered by project_id or date
// ?project_id=xxx&date=2025-01-15
export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const date      = searchParams.get("date");

  const supabase = createServerClient();
  let query = supabase
    .from("daily_reports")
    .select("id, project_id, date, weather, summary, special_events, created_at, project:project_id(id, name)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (projectId) query = query.eq("project_id", projectId);
  if (date)      query = query.eq("date", date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

// POST — submit a daily report
export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { project_id?: string; date?: string; weather?: string; summary?: string; special_events?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { project_id, date, weather, summary, special_events } = body;
  if (!project_id) {
    return NextResponse.json({ error: "project_id חובה" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("daily_reports")
    .insert({
      project_id,
      date: date ?? new Date().toISOString().slice(0, 10),
      weather: weather?.trim() || null,
      summary: summary?.trim() || null,
      special_events: special_events?.trim() || null,
    })
    .select("id, project_id, date, weather, summary, special_events, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data }, { status: 201 });
}
