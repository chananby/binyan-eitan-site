import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";
import { isAdminAuthedFromRequest } from "../../../lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isAdminAuthedFromRequest(req))
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    project_id,
    specific_location,
    work_category,
    description,
    agreed_price,
  } = body as {
    project_id?: string;
    specific_location?: string;
    work_category?: string;
    description?: string;
    agreed_price?: string | number;
  };

  if (!project_id || !description || agreed_price === undefined || agreed_price === "") {
    return NextResponse.json(
      { success: false, error: "שדות חובה חסרים: פרויקט, תיאור, מחיר" },
      { status: 400 }
    );
  }

  let supabase: ReturnType<typeof createServerClient>;
  try {
    supabase = createServerClient();
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Supabase not configured" },
      { status: 500 }
    );
  }

  // Build description: include location if provided
  const fullDescription = [
    description,
    specific_location ? `מיקום: ${specific_location}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const { error: insertError } = await supabase.from("budget_items").insert({
    project_id,
    description: fullDescription,
    category: work_category || null,
    estimated_cost: parseFloat(String(agreed_price)) || null,
    actual_cost: null,
  });

  if (insertError) {
    console.error("[change-order] insert error:", insertError.message);
    return NextResponse.json(
      { success: false, error: "שגיאת מסד נתונים — פנה לתמיכה" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
