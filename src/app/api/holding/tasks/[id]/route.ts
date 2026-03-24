/**
 * PATCH /api/holding/tasks/[id]
 * Fully self-contained — no helper imports that can fail silently.
 * Returns JSON on every code path, including crashes.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import { createHmac }                from "crypto";

export const runtime = "nodejs";

// ── Inline auth (no import from exec-auth so no hidden crash) ─────────────────
function resolveAuthor(req: NextRequest): "Hanan" | "Moti" | null {
  try {
    const raw = req.cookies.get("be_exec_token")?.value;
    if (!raw) return null;
    const cookie = raw.trim().toLowerCase();
    const secret = process.env.ADMIN_PASSWORD ?? "be_internal_secret";
    const tok = (a: string) =>
      createHmac("sha256", secret + "-exec").update("exec-v1-" + a).digest("hex");
    if (cookie === tok("Hanan")) return "Hanan";
    if (cookie === tok("Moti"))  return "Moti";
    return null;
  } catch {
    return null;
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // One outer try/catch: the server WILL return JSON no matter what
  try {

    // 1. Auth
    const author = resolveAuthor(req);
    if (!author) {
      return NextResponse.json(
        { error: "Unauthorized", debug: { cookie_present: !!req.cookies.get("be_exec_token") } },
        { status: 401 },
      );
    }

    // 2. Body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Cannot parse JSON body", detail: String(e) }, { status: 400 });
    }

    // 3. Build update payload (status, title, notes, company_id — all optional)
    const VALID_STATUS = ["backlog", "urgent", "in_progress", "pending", "done"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = {};

    if ("status" in body) {
      const status = String(body.status ?? "");
      if (!VALID_STATUS.includes(status)) {
        return NextResponse.json({ error: "Invalid status", received: status, valid: VALID_STATUS }, { status: 400 });
      }
      patch.status = status;
    }
    if ("title" in body) {
      const title = String(body.title ?? "").trim();
      if (!title) return NextResponse.json({ error: "title לא יכול להיות ריק" }, { status: 400 });
      patch.title = title;
    }
    if ("notes" in body)      patch.notes      = body.notes      ? String(body.notes).trim() : null;
    if ("company_id" in body) patch.company_id = body.company_id ? String(body.company_id)   : null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
    }

    // 4. Task ID
    const taskId = params?.id ?? "";
    if (!taskId) {
      return NextResponse.json({ error: "Missing task ID in URL" }, { status: 400 });
    }

    // 5. Supabase env vars
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase env vars missing", url_ok: !!supabaseUrl, key_ok: !!serviceKey },
        { status: 500 },
      );
    }

    // 6. DB update — plain UPDATE, no .select(), no .single()
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { error: dbErr } = await supabase
      .from("holding_tasks")
      .update(patch)
      .eq("id", taskId);

    if (dbErr) {
      console.error("[PATCH holding/tasks]", dbErr);
      return NextResponse.json(
        { error: dbErr.message, code: dbErr.code, details: dbErr.details, hint: dbErr.hint },
        { status: 500 },
      );
    }

    // 7. Success
    return NextResponse.json({ ok: true, task_id: taskId, patch, author });

  } catch (fatal) {
    // Absolute last resort — still returns JSON so the alert() fires
    console.error("[PATCH holding/tasks] FATAL:", fatal);
    return NextResponse.json({ error: "Fatal server error", detail: String(fatal) }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const author = resolveAuthor(req);
    if (!author) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { error: dbErr } = await supabase
      .from("holding_tasks")
      .delete()
      .eq("id", params.id);

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (fatal) {
    console.error("[DELETE holding/tasks] FATAL:", fatal);
    return NextResponse.json({ error: "Fatal server error", detail: String(fatal) }, { status: 500 });
  }
}
