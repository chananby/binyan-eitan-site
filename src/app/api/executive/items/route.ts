import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase";
import { isExecAuthedFromRequest } from "../../../../lib/exec-auth";

export const runtime = "nodejs";

const VALID_TYPES = ["task", "feed", "deadline"] as const;
type ItemType = typeof VALID_TYPES[number];

/** GET — list items (optionally filter by ?type=task|feed|deadline) */
export async function GET(req: NextRequest) {
  if (!isExecAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") as ItemType | null;
  const supabase = createServerClient();

  let query = supabase
    .from("executive_space")
    .select("*")
    .order("created_at", { ascending: true });

  if (type && VALID_TYPES.includes(type)) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

/** POST — create item */
export async function POST(req: NextRequest) {
  if (!isExecAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    type?: ItemType; content?: string; author?: string;
    priority?: number; due_date?: string; category?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { type, content, author, priority, due_date, category } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (type === "feed" && !author) {
    return NextResponse.json({ error: "Author required for feed" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("executive_space")
    .insert({
      type,
      content: content.trim(),
      ...(author    && { author }),
      ...(priority  !== undefined && { priority }),
      ...(due_date  && { due_date }),
      ...(category  && { category }),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
