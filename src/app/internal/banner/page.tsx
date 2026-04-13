import Image from "next/image";

export default function BannerPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#aaa",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "40px 20px",
        fontFamily: "'Heebo', 'Arial Hebrew', Arial, sans-serif",
      }}
    >
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700;900&display=swap"
        rel="stylesheet"
      />

      {/* Banner: 60×100 cm → 600×1000 px on screen */}
      <div
        dir="rtl"
        style={{
          width: 600,
          height: 1000,
          backgroundColor: "#F0EDE6",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
          position: "relative",
        }}
      >
        {/* ── TOP BAND ── */}
        <div
          style={{
            backgroundColor: "#2D2926",
            padding: "28px 32px 24px",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              color: "#F0EDE6",
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: "0.03em",
              lineHeight: 1,
              margin: 0,
            }}
          >
            כאן בונים בכיף
          </h1>
          <div
            style={{
              width: 60,
              height: 3,
              background: "#8D775F",
              margin: "12px auto 0",
              borderRadius: 2,
            }}
          />
        </div>

        {/* ── LOGO + NAME ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 32px 16px",
            flexShrink: 0,
            gap: 14,
          }}
        >
          <Image
            src="/logo.png"
            alt="לוגו בניין איתן"
            width={160}
            height={80}
            style={{ objectFit: "contain" }}
          />
          <div
            style={{
              fontSize: 50,
              fontWeight: 900,
              color: "#2D2926",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            בניין איתן
          </div>
        </div>

        {/* ── SLOGAN ── */}
        <div
          style={{
            textAlign: "center",
            padding: "0 40px 24px",
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: 22, fontWeight: 400, color: "#5a4e45", lineHeight: 1.6, margin: 0 }}>
            בונים עתיד יציב.
          </p>
          <p style={{ fontSize: 22, fontWeight: 400, color: "#5a4e45", lineHeight: 1.6, margin: 0 }}>
            אתכם ובשבילכם.
          </p>
        </div>

        {/* ── DIVIDER ── */}
        <div
          style={{
            width: "calc(100% - 64px)",
            height: 2,
            background: "linear-gradient(90deg, transparent, #8D775F 20%, #8D775F 80%, transparent)",
            margin: "0 32px",
            flexShrink: 0,
          }}
        />

        {/* ── CONTACTS ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 40px 16px",
          }}
        >
          {/* WhatsApp label */}
          <div style={{ fontSize: 12, fontWeight: 300, color: "#8D775F", letterSpacing: "0.12em", marginBottom: 4 }}>
            וואטסאפ / טלפון
          </div>

          {/* WhatsApp number */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <WhatsAppIcon />
            <span style={{ fontSize: 32, fontWeight: 700, color: "#2D2926", direction: "ltr", letterSpacing: "0.05em" }}>
              058-500-8447
            </span>
          </div>

          {/* Office phone label */}
          <div style={{ fontSize: 12, fontWeight: 300, color: "#8D775F", letterSpacing: "0.12em", marginBottom: 4 }}>
            טלפון משרד
          </div>

          {/* Office number */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <PhoneIcon />
            <span style={{ fontSize: 32, fontWeight: 700, color: "#2D2926", direction: "ltr", letterSpacing: "0.05em" }}>
              02-5000-447
            </span>
          </div>

          {/* QR */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://wa.me/972585008447&color=2D2926&bgcolor=ffffff&margin=4"
              alt="QR וואטסאפ"
              width={120}
              height={120}
              style={{ border: "3px solid #2D2926", padding: 6, background: "#fff" }}
            />
            <span style={{ fontSize: 11, color: "#8D775F", letterSpacing: "0.1em" }}>סרוק לוואטסאפ</span>
          </div>

          {/* Website */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <GlobeIcon />
            <span style={{ fontSize: 17, color: "#3a302a", direction: "ltr" }}>www.binyaneitan.com</span>
          </div>

          {/* Email */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MailIcon />
            <span style={{ fontSize: 17, color: "#3a302a", direction: "ltr" }}>office@binyaneitan.com</span>
          </div>
        </div>

        {/* ── BOTTOM BAND ── */}
        <div style={{ backgroundColor: "#2D2926", height: 18, flexShrink: 0 }} />
      </div>
    </div>
  );
}

/* ── Icons ── */
function WhatsAppIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.402A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25D366"/>
      <path d="M16.75 14.49c-.27-.135-1.6-.79-1.847-.879-.247-.09-.427-.135-.607.135-.18.27-.697.879-.854 1.059-.157.18-.314.202-.584.067-.27-.135-1.14-.42-2.172-1.34-.803-.716-1.345-1.6-1.503-1.87-.157-.27-.017-.416.118-.55.12-.12.27-.315.405-.472.134-.157.18-.27.27-.45.089-.18.044-.337-.022-.472-.067-.135-.607-1.462-.832-2.002-.219-.526-.441-.454-.607-.463l-.517-.009c-.18 0-.472.067-.72.337-.246.27-.942.92-.942 2.244s.965 2.602 1.1 2.782c.134.18 1.9 2.9 4.603 4.066.643.278 1.145.444 1.535.568.645.205 1.232.176 1.696.107.517-.077 1.6-.654 1.826-1.285.225-.63.225-1.17.157-1.285-.067-.112-.247-.18-.517-.315z" fill="#fff"/>
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.18 21 3 13.82 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.24 1.01l-2.21 2.21z" fill="#8D775F"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#2D2926" strokeWidth="1.5"/>
      <path d="M12 3c-2 2.5-3 5-3 9s1 6.5 3 9M12 3c2 2.5 3 5 3 9s-1 6.5-3 9M3 12h18" stroke="#2D2926" strokeWidth="1.5"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#2D2926" strokeWidth="1.5"/>
      <path d="M3 7l9 6 9-6" stroke="#2D2926" strokeWidth="1.5"/>
    </svg>
  );
}
