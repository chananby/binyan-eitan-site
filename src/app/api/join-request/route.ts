/**
 * POST /api/join-request — public submission of a "new worker" request.
 *
 * Wide-open by design: a worker who has never been added to staff
 * doesn't have the family PIN, so this endpoint sits OUTSIDE the
 * /api/admin/* + /api/worker/* gated families. The /he/join page
 * (sibling of /he/internal, no PinGate) posts here.
 *
 * Defences:
 *   • Rate-limit per IP (5 / 15 min via the shared checkRateLimit
 *     helper). Same posture as /api/internal-auth and
 *     /api/worker/identify.
 *   • Strict validation through src/lib/join-requests-validate so the
 *     stored payload is canonicalised the same way the form expected.
 *   • Anti-spam: the join_requests table has a partial UNIQUE index on
 *     phone WHERE status='pending'. A 23505 here means the worker
 *     already has an open request — surface it as a friendly 409, not
 *     as a generic 500.
 *   • Response carries `{ ok: true }` only — never the row id, so a bot
 *     can't enumerate / probe / link to anything.
 *
 * Admin GET / approve / reject lives in PR 2 under /api/admin/join-requests/*.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../lib/rate-limit";
import { validateJoinRequest } from "../../../lib/join-requests-validate";
import { phoneVariants } from "../../../lib/phone";

export const runtime = "nodejs";

// 5 hits per IP per 15 min — matches the worker-identify posture so a
// scraper hitting either won't have two separate budgets.
const MAX_HITS_PER_IP = 5;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`${clientIp(req)}:join-request`, MAX_HITS_PER_IP);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "יותר מדי בקשות. נסה שוב בעוד כמה דקות." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Trust nothing about the shape — validateJoinRequest accepts unknown
  // values and shapes them into the canonical form (or returns errors).
  const result = validateJoinRequest(
    (body && typeof body === "object" ? body : {}) as Record<string, unknown>,
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "פרטים לא תקינים", fields: result.errors },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Guard against an already-onboarded worker resubmitting the join form.
  // Without this the request lands in the admin queue and only gets caught
  // by manual triage. Same phoneVariants() expansion the worker-identify
  // lookup uses, so the match is consistent with how the row was stored
  // (legacy formats, Sri Lanka intl, etc.) — never invent a new pattern
  // here; the two flows must agree on "same phone".
  const { data: existingStaff, error: staffLookupErr } = await supabase
    .from("staff")
    .select("id")
    .in("phone", phoneVariants(result.data.phone))
    .eq("active", true)
    .is("deleted_at", null)
    .limit(1);
  if (staffLookupErr) {
    console.error("[join-request POST] staff lookup", JSON.stringify(staffLookupErr));
    return NextResponse.json({ ok: false, error: "שגיאה בשמירת הבקשה" }, { status: 500 });
  }
  if (existingStaff && existingStaff.length > 0) {
    return NextResponse.json(
      { ok: false, error: "המספר כבר רשום במערכת. אם צריך עדכון, פנה למנהל." },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("join_requests")
    .insert({
      full_name:   result.data.full_name,
      phone:       result.data.phone,
      description: result.data.description,
      // status defaults to 'pending' at the DB level; not overriding.
    });

  if (error) {
    // 23505 = unique_violation on the partial index
    //   (phone WHERE status='pending'). Friendly response — the
    //   request from the same worker is already in the queue.
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { ok: false, error: "כבר נשלחה בקשה עם מספר זה — ניצור איתך קשר בקרוב." },
        { status: 409 },
      );
    }
    console.error("[join-request POST]", JSON.stringify(error));
    return NextResponse.json({ ok: false, error: "שגיאה בשמירת הבקשה" }, { status: 500 });
  }

  // Deliberately minimal — no id, no echo of the input.
  return NextResponse.json({ ok: true });
}
