import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST() {
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

    return NextResponse.json({ ok: true, message: "Revalidation queued" });
  } catch (err) {
    console.error("Revalidation failed:", err);
    return NextResponse.json({ ok: false, error: "Revalidation failed" }, { status: 500 });
  }
}
