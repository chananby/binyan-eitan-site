import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "maintenance_mode").maybeSingle();
  return NextResponse.json({ maintenance: data?.value === "true" });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { enabled?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = createServerClient();
  const value = body.enabled ? "true" : "false";

  // Upsert the settings row
  const { error } = await supabase.from("settings").upsert({ key: "maintenance_mode", value }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Invalidate the middleware's cached read so the change takes effect now
  // instead of waiting for the 30s revalidate window.
  revalidateTag("maintenance_mode");
  return NextResponse.json({ maintenance: body.enabled });
}
