import Image from "next/image";

export default function BannerPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#555",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 20px",
        fontFamily: "'Heebo', 'Arial Hebrew', Arial, sans-serif",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700;900&display=swap"
        rel="stylesheet"
      />

      {/* ── Banner 100×60 cm → 1000×600 px ── */}
      <div
        dir="rtl"
        style={{
          width: 1000,
          height: 600,
          backgroundColor: "#EDE9E1",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 12px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* ══ TOP GOLD BAND ══ */}
        <div
          style={{
            backgroundColor: "#B8956A",
            padding: "14px 40px",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              color: "#1C1A18",
              fontSize: 58,
              fontWeight: 900,
              letterSpacing: "0.06em",
              lineHeight: 1,
              margin: 0,
            }}
          >
            כאן בונים בכיף
          </h1>
        </div>

        {/* ══ MAIN BODY ══ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "row" }}>

          {/* ── RIGHT: branding ── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px 32px",
              gap: 10,
              borderLeft: "1px solid #C8BFB5",
            }}
          >
            <Image
              src="/logo.png"
              alt="לוגו בניין איתן"
              width={150}
              height={75}
              style={{ objectFit: "contain" }}
            />
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: "#1C1A18",
                letterSpacing: "0.05em",
                lineHeight: 1,
              }}
            >
              בניין איתן
            </div>
            <div style={{ width: 48, height: 3, background: "#B8956A", borderRadius: 2 }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 300, color: "#5a4e45", lineHeight: 1.6, margin: 0 }}>
                בונים עתיד יציב. אתכם ובשבילכם.
              </p>
            </div>
          </div>

          {/* ── LEFT: contacts ── */}
          <div
            style={{
              width: 410,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "24px 28px 24px 20px",
              gap: 14,
              backgroundColor: "#E0DAD0",
            }}
          >
            {/* WhatsApp */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <WhatsAppIcon size={36} />
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: "#1C1A18",
                  direction: "ltr",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                058-500-8447
              </span>
            </div>

            {/* Office phone */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PhoneIcon size={32} />
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#2D2926",
                  direction: "ltr",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                02-5000-447
              </span>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#C8BFB5" }} />

            {/* QR + web/email row */}
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* QR */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://wa.me/972585008447&color=1C1A18&bgcolor=E0DAD0&margin=4"
                  alt="QR וואטסאפ"
                  width={88}
                  height={88}
                  style={{ border: "2px solid #B8956A", padding: 4 }}
                />
                <span style={{ fontSize: 9, color: "#B8956A", letterSpacing: "0.1em" }}>סרוק לוואטסאפ</span>
              </div>

              {/* Web + email */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GlobeIcon />
                  <span style={{ fontSize: 16, color: "#2D2926", direction: "ltr" }}>www.binyaneitan.com</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MailIcon />
                  <span style={{ fontSize: 16, color: "#2D2926", direction: "ltr" }}>office@binyaneitan.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ BOTTOM GOLD STRIP ══ */}
        <div style={{ backgroundColor: "#B8956A", height: 12, flexShrink: 0 }} />
      </div>
    </div>
  );
}

function WhatsAppIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.402A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25D366"/>
      <path d="M16.75 14.49c-.27-.135-1.6-.79-1.847-.879-.247-.09-.427-.135-.607.135-.18.27-.697.879-.854 1.059-.157.18-.314.202-.584.067-.27-.135-1.14-.42-2.172-1.34-.803-.716-1.345-1.6-1.503-1.87-.157-.27-.017-.416.118-.55.12-.12.27-.315.405-.472.134-.157.18-.27.27-.45.089-.18.044-.337-.022-.472-.067-.135-.607-1.462-.832-2.002-.219-.526-.441-.454-.607-.463l-.517-.009c-.18 0-.472.067-.72.337-.246.27-.942.92-.942 2.244s.965 2.602 1.1 2.782c.134.18 1.9 2.9 4.603 4.066.643.278 1.145.444 1.535.568.645.205 1.232.176 1.696.107.517-.077 1.6-.654 1.826-1.285.225-.63.225-1.17.157-1.285-.067-.112-.247-.18-.517-.315z" fill="#fff"/>
    </svg>
  );
}

function PhoneIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.24 1.01l-2.21 2.21z" fill="#B8956A"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke="#B8956A" strokeWidth="1.5"/>
      <path d="M12 3c-2 2.5-3 5-3 9s1 6.5 3 9M12 3c2 2.5 3 5 3 9s-1 6.5-3 9M3 12h18" stroke="#B8956A" strokeWidth="1.5"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#B8956A" strokeWidth="1.5"/>
      <path d="M3 7l9 6 9-6" stroke="#B8956A" strokeWidth="1.5"/>
    </svg>
  );
}
