import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isExecAuthedFromRequest,
  getExecAuthorFromRequest,
} from "../../../../lib/exec-auth";

export const runtime = "nodejs";

const VALID_STATUS = ["backlog", "urgent", "in_progress", "pending", "done"] as const;

export async function GET(req: NextRequest) {
  if (!isExecAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("company_id");
  const status    = searchParams.get("status");

  try {
    const supabase = createServerClient();

    // Flat select — no FK join. The cockpit matches company data client-side
    // using the companies list it fetches separately.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("holding_tasks")
      .select("*")
      .order("priority",   { ascending: true })
      .order("created_at", { ascending: false });

    if (companyId) query = query.eq("company_id", companyId);
    if (status)    query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      console.error("[holding/tasks GET] supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: data ?? [] });
  } catch (err) {
    console.error("[holding/tasks GET] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const author = getExecAuthorFromRequest(req);
  if (!author) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    notes?: string;
    status?: string;
    priority?: number;
    company_id?: string;
  };

  try {
    body = await req.json();
  } catch (err) {
    console.error("[holding/tasks POST] invalid JSON:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, notes, status = "backlog", priority = 0, company_id } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  if (!VALID_STATUS.includes(status as typeof VALID_STATUS[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("holding_tasks")
      .insert({
        title:      title.trim(),
        notes:      notes      || null,
        status,
        priority,
        company_id: company_id || null,
        author,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[holding/tasks POST] supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (err) {
    console.error("[holding/tasks POST] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
