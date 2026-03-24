import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isExecAuthedFromRequest,
  getExecAuthorFromRequest,
} from "../../../../lib/exec-auth";

export const runtime = "nodejs";

const SELECT = "*, holding_companies(id, name, color, icon)";

export async function GET(req: NextRequest) {
  if (!isExecAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("company_id");
  const status    = searchParams.get("status");

  let query = supabase
    .from("holding_tasks")
    .select(SELECT)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (companyId) query = query.eq("company_id", companyId);
  if (status)    query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const author = getExecAuthorFromRequest(req);
  if (!author) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; notes?: string; status?: string; priority?: number; company_id?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { title, notes, status = "backlog", priority = 0, company_id } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const VALID = ["backlog", "urgent", "in_progress", "pending", "done"];
  if (!VALID.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const supabase = createServerClient();
  const base = { title: title.trim(), notes: notes || null, status, priority, company_id: company_id || null };

  // First attempt: insert with author
  const first = await supabase.from("holding_tasks")
    .insert({ ...base, author })
    .select(SELECT)
    .single();

  if (!first.error) return NextResponse.json({ task: first.data }, { status: 201 });

  // If 'author' column missing — table was created without it; retry without author
  const missingAuthor =
    first.error.message.includes("author") ||
    first.error.message.toLowerCase().includes("schema cache");

  if (!missingAuthor) {
    return NextResponse.json({ error: first.error.message }, { status: 500 });
  }

  const second = await supabase.from("holding_tasks")
    .insert(base)
    .select(SELECT)
    .single();

  if (second.error) return NextResponse.json({ error: second.error.message }, { status: 500 });

  // Inject author into the returned object so the UI shows it correctly
  return NextResponse.json({ task: { ...second.data, author, _author_column_missing: true } }, { status: 201 });
}
