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

  let upstream: Response;
  try {
    upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Network-level failure (DNS, timeout, TCP)
    return NextResponse.json({ success: false, error: "webhook_unreachable" }, { status: 502 });
  }

  // Read body as text first — Apps Script sometimes returns HTML on errors/redirects
  let text: string;
  try {
    text = await upstream.text();
  } catch {
    return NextResponse.json({ success: false, error: "webhook_unreachable" }, { status: 502 });
  }

  // Try to parse as JSON
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    // Strip HTML tags and return a plain-text diagnostic
    const detail = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
    return NextResponse.json(
      { success: false, error: "webhook_bad_response", detail },
      { status: 502 }
    );
  }

  return NextResponse.json(data, { status: upstream.ok ? 200 : 502 });
}
