import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const TO_EMAIL       = process.env.CONTACT_TO_EMAIL ?? "office@binyaneitan.com";
const FROM_EMAIL     = process.env.CONTACT_FROM_EMAIL ?? "Binyan Eitan <office@binyaneitan.com>";

export async function POST(req: NextRequest) {
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email service not configured. Set RESEND_API_KEY in environment variables." },
      { status: 503 }
    );
  }

  let name = "", phone = "", email = "", message = "";

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    ({ name, phone, email, message } = body);
  } else {
    // FormData (sent by the contact form)
    const fd = await req.formData();
    name    = (fd.get("name")    as string) ?? "";
    phone   = (fd.get("phone")   as string) ?? "";
    email   = (fd.get("email")   as string) ?? "";
    message = (fd.get("message") as string) ?? "";
  }

  // Only name + phone are mandatory now — the form was shortened (May 2026)
  // to remove conversion friction. Email and message stay optional so legacy
  // inbound flows (existing webhooks, embeds) keep working without changes.
  if (!name || !phone) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const optionalRow = (label: string, value: string) =>
    value
      ? `<tr style="background: #F3F2EE;">
           <td style="padding: 10px 8px; font-weight: bold; vertical-align: top; color: #8D775F;">${label}:</td>
           <td style="padding: 10px 8px; white-space: pre-wrap;">${escHtml(value)}</td>
         </tr>`
      : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #2D2926;">
      <h2 style="border-bottom: 2px solid #8D775F; padding-bottom: 8px; color: #8D775F;">
        פנייה חדשה דרך האתר — בניין איתן
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr>
          <td style="padding: 10px 0; font-weight: bold; width: 120px; color: #8D775F;">שם:</td>
          <td style="padding: 10px 0;">${escHtml(name)}</td>
        </tr>
        <tr style="background: #F3F2EE;">
          <td style="padding: 10px 8px; font-weight: bold; color: #8D775F;">טלפון:</td>
          <td style="padding: 10px 8px;">${escHtml(phone)}</td>
        </tr>
        ${optionalRow("אימייל", email)}
        ${optionalRow("הודעה", message)}
      </table>
      <p style="margin-top: 24px; font-size: 11px; color: #999;">
        נשלח דרך טופס יצירת קשר באתר binyaneitan.com
      </p>
    </div>
  `;

  // Resend rejects an empty reply_to; only set it when an address was given.
  const resendBody: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: [TO_EMAIL],
    subject: `פנייה חדשה מהאתר — ${name}`,
    html,
  };
  if (email) resendBody.reply_to = email;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resendBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[contact/route] Resend error", res.status, err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
