/**
 * POST /api/holding/upload
 * Upload a file to Supabase Storage (bucket: cockpit-files) and return the public URL.
 *
 * Prerequisites:
 *   1. In the Supabase dashboard → Storage → create a bucket named "cockpit-files"
 *   2. Set the bucket to public (so getPublicUrl works without auth)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getExecAuthorFromRequest } from "../../../../lib/exec-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!getExecAuthorFromRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "קובץ גדול מדי (מקסימום 10MB)" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const ext  = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("cockpit-files")
      .upload(path, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      console.error("[holding/upload] storage error:", error);
      // Helpful message if bucket doesn't exist
      const msg = error.message.includes("Bucket not found")
        ? "דלי אחסון 'cockpit-files' לא קיים — צור אותו ב-Supabase Storage"
        : error.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("cockpit-files")
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl });
  } catch (fatal) {
    console.error("[holding/upload] FATAL:", fatal);
    return NextResponse.json({ error: String(fatal) }, { status: 500 });
  }
}
