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

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    revalidateTag("translations");
    revalidatePath("/en");
    revalidatePath("/he");
    revalidatePath("/en/about");
    revalidatePath("/he/about");
    revalidatePath("/en/expertise");
    revalidatePath("/he/expertise");
    revalidatePath("/en/expertise/g1-contractor-certification");
    revalidatePath("/he/expertise/g1-contractor-certification");
    revalidatePath("/en/expertise/building-from-abroad");
    revalidatePath("/he/expertise/building-from-abroad");
    revalidatePath("/en/expertise/behind-the-walls");
    revalidatePath("/he/expertise/behind-the-walls");
    revalidatePath("/en/faq");
    revalidatePath("/he/faq");
    revalidatePath("/en/change-order");
    revalidatePath("/he/change-order");
    revalidatePath("/en/legal");
    revalidatePath("/he/legal");
    revalidatePath("/en/projects");
    revalidatePath("/he/projects");

    return NextResponse.json({ ok: true, message: "Revalidation queued" });
  } catch (err) {
    console.error("Revalidation failed:", err);
    return NextResponse.json({ ok: false, error: "Revalidation failed" }, { status: 500 });
  }
}
