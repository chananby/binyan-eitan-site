import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { isAdminAuthedFromRequest } from "../../../lib/admin-auth";
import { verifyInternalToken } from "../../../lib/admin-auth";

const INTERNAL_COOKIE = "be_internal_token";

function isAuthorized(req: NextRequest): boolean {
  if (isAdminAuthedFromRequest(req)) return true;
  const t = req.cookies.get(INTERNAL_COOKIE)?.value;
  return !!t && verifyInternalToken(t);
}

// Fallback paths — covers the static / well-known routes. Dynamic article
// slugs are passed by the caller via the `paths` body field.
const DEFAULT_PATHS = [
  "/en", "/he",
  "/en/about", "/he/about",
  "/en/expertise", "/he/expertise",
  "/en/expertise/g1-contractor-certification", "/he/expertise/g1-contractor-certification",
  "/en/expertise/building-from-abroad", "/he/expertise/building-from-abroad",
  "/en/expertise/behind-the-walls", "/he/expertise/behind-the-walls",
  "/en/faq", "/he/faq",
  "/en/change-order", "/he/change-order",
  "/en/legal", "/he/legal",
  "/en/projects", "/he/projects",
];

// Allow only same-origin app paths — prevents abuse of the endpoint to
// "thrash" arbitrary tag namespaces or absolute URLs.
function isAppPath(p: unknown): p is string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//");
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Optional body { paths?: string[], tags?: string[] }. No body → fallback.
  let bodyPaths: string[] | undefined;
  let bodyTags:  string[] | undefined;
  try {
    const raw = await req.text();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.paths)) bodyPaths = parsed.paths.filter(isAppPath);
      if (Array.isArray(parsed?.tags))  bodyTags  = parsed.tags.filter((t: unknown): t is string => typeof t === "string");
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    // Tag — always bump translations tag, plus any caller-supplied tags.
    revalidateTag("translations");
    if (bodyTags) for (const t of bodyTags) revalidateTag(t);

    // Paths — caller list takes precedence; if missing, fall back to defaults.
    const paths = bodyPaths && bodyPaths.length > 0 ? bodyPaths : DEFAULT_PATHS;
    for (const p of paths) revalidatePath(p);

    return NextResponse.json({ ok: true, revalidated: paths.length });
  } catch (err) {
    console.error("Revalidation failed:", err);
    return NextResponse.json({ ok: false, error: "Revalidation failed" }, { status: 500 });
  }
}
