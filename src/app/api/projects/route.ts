import { NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createServerClient();
    // Used by both AttendanceForm (worker clock-in site picker) and the
    // ChangeOrderForm — neither flow should ever land on an overhead
    // project. project_type='site' filters meta projects out.
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, status")
      .in("status", ["active", "planning"])
      .eq("project_type", "site")
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
