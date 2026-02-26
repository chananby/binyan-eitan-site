import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { revalidateTag } from "next/cache";
import defaultTranslations from "@/src/lib/translations.json";

const KV_KEY = "site_translations";

export async function GET() {
  try {
    const stored = await kv.get(KV_KEY);
    
    // אם המחסן ריק, נחזיר את ברירת המחדל
    if (!stored) {
      return NextResponse.json(defaultTranslations);
    }
    
    return NextResponse.json(stored);
  } catch (err) {
    console.error("[translations/GET] Error:", err);
    return NextResponse.json(defaultTranslations);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    
    // שומרים את המידע ישירות למחסן בלי מיזוגים מסובכים שגורמים לקריסה
    await kv.set(KV_KEY, body);
    
    // מרעננים את האתר כדי שהשינוי יופיע מיד
    try {
      revalidateTag("translations");
    } catch (e) {
      console.log("Revalidation tag not ready yet, skipping.");
    }
    
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Save failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// למקרה ש-Vercel חוסם בקשות PUT, אנחנו נאפשר גם POST כגיבוי
export async function POST(req: Request) {
  return PUT(req);
}