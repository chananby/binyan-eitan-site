import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function resolveAuthor(req: NextRequest): "Hanan" | "Moti" | null {
  const cookie = req.cookies.get("be_exec_token")?.value ?? "";
  if (cookie === "AUTHORIZED_HANAN") return "Hanan";
  if (cookie === "AUTHORIZED_MOTI")  return "Moti";
  return null;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    if (!resolveAuthor(req))
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
