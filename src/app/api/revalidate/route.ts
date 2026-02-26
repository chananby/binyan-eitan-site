import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST() {
  try {
    // Revalidate all pages that use translations
    revalidateTag("translations");
    revalidatePath("/en");
    revalidatePath("/he");
    revalidatePath("/en/about");
    revalidatePath("/en/projects");
    revalidatePath("/en/expertise");
    revalidatePath("/en/behind-the-walls");
    revalidatePath("/en/building-from-afar");
    revalidatePath("/en/faq");
    revalidatePath("/en/change-order");
    revalidatePath("/en/legal");
    revalidatePath("/he/about");
    revalidatePath("/he/projects");
    revalidatePath("/he/expertise");
    revalidatePath("/he/behind-the-walls");
    revalidatePath("/he/building-from-afar");
    revalidatePath("/he/faq");
    revalidatePath("/he/change-order");
    revalidatePath("/he/legal");

    return NextResponse.json({ ok: true, message: "Revalidation queued" });
  } catch (err) {
    console.error("Revalidation failed:", err);
    return NextResponse.json({ ok: false, error: "Revalidation failed" }, { status: 500 });
  }
}
