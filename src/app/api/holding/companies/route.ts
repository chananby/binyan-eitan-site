import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getExecAuthorFromRequest } from "../../../../lib/exec-auth";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    if (!getExecAuthorFromRequest(req))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("holding_companies")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ companies: data ?? [] });
  } catch (fatal) {
    return NextResponse.json({ error: String(fatal) }, { status: 500 });
  }
}
