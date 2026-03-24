import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import {
  isExecAuthedFromRequest,
  getExecAuthorFromRequest,
} from "../../../../lib/exec-auth";

export const runtime = "nodejs";

const SELECT = "*, holding_companies(id, name, color, icon)";

// Columns that may be missing if table was created via Supabase UI without full migration.
// We try inserting with all fields; on schema-cache errors we drop the offending field and retry.
const OPTIONAL_COLS = ["author", "notes", "priority", "company_id", "updated_at"] as const;
type OptionalCol = typeof OPTIONAL_COLS[number];

function isSchemaError(msg: string, col?: string) {
  if (!msg.toLowerCase().includes("schema cache") && !msg.includes("Could not find")) return false;
  return col ? msg.includes(`'${col}'`) : true;
}

async function insertWithFallback(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  payload: Record<string, unknown>,
): Promise<{ data: unknown; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from("holding_tasks")
    .insert(payload)
    .select(SELECT)
    .single();

  if (!error) return { data, error: null };

  // Not a schema-cache error — surface it as-is
  if (!isSchemaError(error.message)) return { data: null, error };

  // Find which optional column triggered the error and drop it, then retry
  const badCol = OPTIONAL_COLS.find(c => error.message.includes(`'${c}'`));
  if (!badCol) return { data: null, error };

  const reduced = { ...payload };
  delete reduced[badCol as OptionalCol];

  // Recurse — handles multiple missing columns one at a time
  return insertWithFallback(supabase, reduced);
}

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

  const { data, error } = await insertWithFallback(supabase, {
    title: title.trim(),
    notes: notes || null,
    status,
    priority,
    company_id: company_id || null,
    author,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Always ensure author is present in the response even if column was missing
  return NextResponse.json({ task: { ...data as object, author } }, { status: 201 });
}
