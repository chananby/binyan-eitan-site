/**
 * Bunker build — fully self-contained, no helper imports that can crash silently.
 * Returns JSON on every code path.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac }   from "crypto";

export const runtime = "nodejs";

// ── Inline helpers ────────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

function isAdminAuthed(req: NextRequest): boolean {
  try {
    const pw  = process.env.ADMIN_PASSWORD;
    if (!pw) return false;
    const tok = Buffer.from(pw).toString("base64");
    return req.cookies.get("be_admin_token")?.value === tok;
  } catch { return false; }
}

function isForemanAuthed(req: NextRequest): string | null {
  try {
    const ft = req.cookies.get("be_foreman_token")?.value;
    if (!ft) return null;
    const decoded  = Buffer.from(ft, "base64").toString("utf8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) return null;
    const staffId = decoded.slice(0, colonIdx);
    const sig     = decoded.slice(colonIdx + 1);
    const secret  = process.env.ADMIN_PASSWORD ?? "be_internal_secret";
    const expected = createHmac("sha256", secret).update(staffId).digest("hex").slice(0, 32);
    return sig === expected ? staffId : null;
  } catch { return null; }
}

function isAuthed(req: NextRequest): boolean {
  return isAdminAuthed(req) || isForemanAuthed(req) !== null;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    if (!isAuthed(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const date      = searchParams.get("date");

    const supabase = getSupabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("daily_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (projectId) query = query.eq("project_id", projectId);
    if (date)      query = query.eq("date", date);

    // Foreman: restrict to their projects
    const foremanId = isForemanAuthed(req);
    if (!isAdminAuthed(req) && foremanId && !projectId) {
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
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ reports: data ?? [] });
  } catch (fatal) {
    console.error("[admin/daily-reports GET] FATAL:", fatal);
    return NextResponse.json({ error: String(fatal) }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    if (!isAuthed(req)) {
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
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { project_id, weather, summary, special_events, status, subcontractor_count } = body;

    if (!project_id) {
      return NextResponse.json({ error: "project_id חובה" }, { status: 400 });
    }

    // Foreman can only log for today
    const today      = new Date().toISOString().slice(0, 10);
    const reportDate = body.date ?? today;
    const foremanId  = isForemanAuthed(req);
    if (!isAdminAuthed(req) && foremanId && reportDate !== today) {
      return NextResponse.json({ error: "ניתן לרשום יומן רק להיום" }, { status: 403 });
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
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (fatal) {
    console.error("[admin/daily-reports POST] FATAL:", fatal);
    return NextResponse.json({ error: String(fatal) }, { status: 500 });
  }
}
