import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isAuthedFromRequest,
  getRoleFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const date      = searchParams.get("date");

  try {
    const supabase = createServerClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("daily_reports")
      .select("*")
      .order("date",       { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (projectId) query = query.eq("project_id", projectId);
    if (date)      query = query.eq("date", date);

    // Foreman: restrict to projects they are assigned to
    if (getRoleFromRequest(req) === "foreman" && !projectId) {
      const staffId = getForemanStaffIdFromRequest(req);
      if (staffId) {
        const { data: projs, error: projErr } = await supabase
          .from("projects")
          .select("id")
          .eq("foreman_id", staffId);

        if (projErr) {
          console.error("[admin/daily-reports GET] foreman projects lookup error:", projErr);
          return NextResponse.json({ error: projErr.message }, { status: 500 });
        }

        const ids = (projs ?? []).map((p: { id: string }) => p.id);
        if (ids.length === 0) return NextResponse.json({ reports: [] });
        query = query.in("project_id", ids);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("[admin/daily-reports GET] supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: data ?? [] });
  } catch (err) {
    console.error("[admin/daily-reports GET] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    project_id?: string;
    date?: string;
    weather?: string;
    summary?: string;
    special_events?: string;
    status?: string;
    subcontractor_count?: number;
  };

  try {
    body = await req.json();
  } catch (err) {
    console.error("[admin/daily-reports POST] invalid JSON:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { project_id, date, weather, summary, special_events, status, subcontractor_count } = body;

  if (!project_id) {
    return NextResponse.json({ error: "project_id חובה" }, { status: 400 });
  }

  // Foreman can only log for today
  const today      = new Date().toISOString().slice(0, 10);
  const reportDate = date ?? today;
  if (getRoleFromRequest(req) === "foreman" && reportDate !== today) {
    return NextResponse.json({ error: "ניתן לרשום יומן רק להיום" }, { status: 403 });
  }

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("daily_reports")
      .insert({
        project_id,
        date:                reportDate,
        weather:             weather?.trim()        || null,
        summary:             summary?.trim()        || null,
        special_events:      special_events?.trim() || null,
        status:              status                 ?? "normal",
        subcontractor_count: subcontractor_count    ?? 0,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[admin/daily-reports POST] supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ report: data }, { status: 201 });
  } catch (err) {
    console.error("[admin/daily-reports POST] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
