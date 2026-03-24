/**
 * Bunker build — fully self-contained, no helper imports that can crash silently.
 * Returns JSON on every code path.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const VALID_UNITS      = ["קוב", 'מ"ר', 'מ"א', "יחידות", "טון", 'ק"ג', "ליטר"];
const VALID_CATEGORIES = ["חומרים", "קבלן משנה", "הזמנות", "כלי עבודה"];

// ── Inline helpers ────────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

function isAuthed(req: NextRequest): boolean {
  try {
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw) return false;
    const tok = Buffer.from(pw).toString("base64");
    if (req.cookies.get("be_admin_token")?.value === tok) return true;
    // Foreman cookie presence = authed enough for read/write
    return !!req.cookies.get("be_foreman_token")?.value;
  } catch { return false; }
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    if (!isAuthed(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");

    const supabase = getSupabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("materials")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;

    if (error) {
      console.error("[admin/materials GET] supabase error:", error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    // Per-project budget summary from flat rows
    const budgetMap: Record<string, { project_name: string; total: number }> = {};
    for (const row of data ?? []) {
      const pid = row.project_id as string;
      if (!budgetMap[pid]) budgetMap[pid] = { project_name: pid, total: 0 };
      budgetMap[pid].total += Number(row.cost ?? 0);
    }
    const budget = Object.entries(budgetMap).map(([project_id, v]) => ({ project_id, ...v }));

    return NextResponse.json({ materials: data ?? [], budget });
  } catch (fatal) {
    console.error("[admin/materials GET] FATAL:", fatal);
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
      daily_report_id?: string;
      material_name?: string;
      quantity?: number;
      unit?: string;
      supplier?: string;
      cost?: number;
      category?: string;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { project_id, daily_report_id, material_name, quantity, unit, supplier, cost, category } = body;

    if (!project_id || !material_name?.trim()) {
      return NextResponse.json({ error: "project_id ושם פריט הם שדות חובה" }, { status: 400 });
    }
    if (unit && !VALID_UNITS.includes(unit)) {
      return NextResponse.json({ error: "יחידה לא תקינה" }, { status: 400 });
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "קטגוריה לא תקינה" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Plain insert — no .select().single() to avoid PGRST116
    const { error } = await supabase
      .from("materials")
      .insert({
        project_id,
        daily_report_id: daily_report_id || null,
        material_name:   material_name.trim(),
        quantity:        quantity  ?? 1,
        unit:            unit      ?? "יחידות",
        supplier:        supplier?.trim() || null,
        cost:            cost      ?? null,
        category:        category  ?? "חומרים",
      });

    if (error) {
      console.error("[admin/materials POST] supabase error:", error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (fatal) {
    console.error("[admin/materials POST] FATAL:", fatal);
    return NextResponse.json({ error: String(fatal) }, { status: 500 });
  }
}
