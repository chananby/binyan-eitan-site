import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createServerClient } from "../../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../../lib/admin-auth";
import { unauthorized, badRequest, serverError } from "../../../../lib/api-response";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return unauthorized();
  }
  const supabase = createServerClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "maintenance_mode").maybeSingle();
  return NextResponse.json({ maintenance: data?.value === "true" });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req)) {
    return unauthorized();
  }
  let body: { enabled?: boolean };
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const supabase = createServerClient();
  const value = body.enabled ? "true" : "false";

  // Upsert the settings row
  const { error } = await supabase.from("settings").upsert({ key: "maintenance_mode", value }, { onConflict: "key" });
  if (error) return serverError(error.message);
  // Invalidate the middleware's cached read so the change takes effect now
  // instead of waiting for the 30s revalidate window.
  revalidateTag("maintenance_mode", "max");
  return NextResponse.json({ maintenance: body.enabled });
}
