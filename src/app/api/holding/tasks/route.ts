/**
 * Bunker build — fully self-contained, no helper imports that can fail silently.
 * Returns JSON on every code path.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const VALID_STATUS = ["backlog", "urgent", "in_progress", "pending", "done"] as const;

// ── Inline helpers ────────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

function resolveAuthor(req: NextRequest): "Hanan" | "Moti" | null {
  const cookie = req.cookies.get("be_exec_token")?.value ?? "";
  if (cookie === "AUTHORIZED_HANAN") return "Hanan";
  if (cookie === "AUTHORIZED_MOTI")  return "Moti";
  return null;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    if (!resolveAuthor(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("company_id");
    const status    = searchParams.get("status");

    const supabase = getSupabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("holding_tasks")
      .select("*")
      .order("priority", { ascending: true })
      .order("id",       { ascending: false });

    if (companyId) query = query.eq("company_id", companyId);
    if (status)    query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      console.error("[holding/tasks GET] supabase error:", error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ tasks: data ?? [] });
  } catch (fatal) {
    console.error("[holding/tasks GET] FATAL:", fatal);
    return NextResponse.json({ error: String(fatal) }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const author = resolveAuthor(req);
    if (!author) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: {
      title?: string; notes?: string;
      status?: string; priority?: number; company_id?: string;
      assigned_to?: string; attachment_url?: string;
    };
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON", detail: String(e) }, { status: 400 });
    }

    const { title, notes, status = "backlog", priority = 0, company_id, assigned_to, attachment_url } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "כותרת משימה חובה" }, { status: 400 });
    }
    if (!VALID_STATUS.includes(status as typeof VALID_STATUS[number])) {
      return NextResponse.json({ error: "סטטוס לא תקין", received: status }, { status: 400 });
    }

    const supabase = getSupabase();

    // Plain insert — no .select().single() to avoid PGRST116
    const { error } = await supabase
      .from("holding_tasks")
      .insert({
        title:      title.trim(),
        notes:      notes?.trim() || null,
        status,
        priority,
        company_id:     company_id     || null,
        assigned_to:    assigned_to    || null,
        attachment_url: attachment_url || null,
        author,
      });

    if (error) {
      console.error("[holding/tasks POST] supabase error:", error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (fatal) {
    console.error("[holding/tasks POST] FATAL:", fatal);
    return NextResponse.json({ error: String(fatal) }, { status: 500 });
  }
}
