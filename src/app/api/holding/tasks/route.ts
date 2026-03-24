import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isExecAuthedFromRequest,
  getExecAuthorFromRequest,
} from "../../../../lib/exec-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isExecAuthedFromRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("company_id");
  const status    = searchParams.get("status");

  let query = supabase
    .from("holding_tasks")
    .select("*, holding_companies(id, name, color, icon)")
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

  let body: {
    title?: string;
    notes?: string;
    status?: string;
    priority?: number;
    company_id?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { title, notes, status = "backlog", priority = 0, company_id } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const VALID = ["backlog", "urgent", "in_progress", "pending", "done"];
  if (!VALID.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("holding_tasks")
    .insert({ title: title.trim(), notes, status, priority, company_id: company_id || null, author })
    .select("*, holding_companies(id, name, color, icon)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data }, { status: 201 });
}
