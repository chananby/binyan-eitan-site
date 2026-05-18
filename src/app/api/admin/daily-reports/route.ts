/**
 * Self-contained route with try/catch on every handler. Returns JSON on every
 * code path. Auth and error-response helpers come from lib/ (current canonical
 * implementations); Supabase client is created inline so this route is robust
 * to import-order issues in the supabase helper.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isAdminAuthedFromRequest,
  isAuthedFromRequest,
  getForemanStaffIdFromRequest,
} from "../../../../lib/admin-auth";
import {
  unauthorized,
  badRequest,
  forbidden,
  serverError,
} from "../../../../lib/api-response";

export const runtime = "nodejs";

// ── Inline Supabase client (intentionally NOT using lib/supabase here) ────────
function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    if (!isAuthedFromRequest(req)) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const date      = searchParams.get("date");

    const supabase = getSupabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("daily_reports")
      .select("*, project:projects(id, name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (projectId) query = query.eq("project_id", projectId);
    if (date)      query = query.eq("date", date);

    // Foreman: restrict to their projects
    const foremanId = getForemanStaffIdFromRequest(req);
    if (!isAdminAuthedFromRequest(req) && foremanId && !projectId) {
      const { data: projs } = await supabase
        .from("projects")
        .select("id")
        .eq("foreman_id", foremanId);
      const ids = (projs ?? []).map((p: { id: string }) => p.id);
      if (ids.length === 0) return NextResponse.json({ reports: [] });
      query = query.in("project_id", ids);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[admin/daily-reports GET] supabase error:", error);
      return serverError(error.message);
    }

    return NextResponse.json({ reports: data ?? [] });
  } catch (fatal) {
    console.error("[admin/daily-reports GET] FATAL:", fatal);
    return serverError(String(fatal));
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    if (!isAuthedFromRequest(req)) {
      return unauthorized();
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
    } catch {
      return badRequest("Invalid JSON");
    }

    const { project_id, weather, summary, special_events, status, subcontractor_count } = body;

    if (!project_id) {
      return badRequest("project_id חובה");
    }

    // Foreman can only log for today
    const today      = new Date().toISOString().slice(0, 10);
    const reportDate = body.date ?? today;
    const foremanId  = getForemanStaffIdFromRequest(req);
    if (!isAdminAuthedFromRequest(req) && foremanId && reportDate !== today) {
      return forbidden("ניתן לרשום יומן רק להיום");
    }

    const supabase = getSupabase();

    // Plain insert — no .select().single() to avoid PGRST116
    const { error } = await supabase
      .from("daily_reports")
      .insert({
        project_id,
        date:                reportDate,
        weather:             weather?.trim()        || null,
        summary:             summary?.trim()        || null,
        special_events:      special_events?.trim() || null,
        status:              status                 ?? "normal",
        subcontractor_count: subcontractor_count    ?? 0,
      });

    if (error) {
      console.error("[admin/daily-reports POST] supabase error:", error);
      return serverError(error.message);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (fatal) {
    console.error("[admin/daily-reports POST] FATAL:", fatal);
    return serverError(String(fatal));
  }
}
