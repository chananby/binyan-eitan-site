import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.ATTENDANCE_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { success: false, error: "webhook_not_configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  }

  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!upstream.ok && upstream.status !== 200) {
      // Non-2xx from Apps Script — try to parse body for error details
      let errBody: unknown;
      try { errBody = await upstream.json(); } catch { errBody = null; }
      return NextResponse.json(
        errBody ?? { success: false, error: "webhook_error" },
        { status: 502 }
      );
    }
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ success: false, error: "webhook_unreachable" }, { status: 502 });
  }
}
