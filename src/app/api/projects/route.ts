import { NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, status")
      .in("status", ["active", "planning"])
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ projects: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Supabase not configured" },
      { status: 500 }
    );
  }
}
