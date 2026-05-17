"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // Detect language from URL (no LangContext available at this level).
  // SSR-safe: default to "he" if window is not defined.
  const path =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const lang = path.startsWith("/en") ? "en" : "he";
  const dir = lang === "he" ? "rtl" : "ltr";

  const t = {
    he: {
      title: "משהו השתבש",
      body: "קרתה שגיאה לא צפויה. הצוות שלנו קיבל התראה ויטפל בכך. נסה לטעון מחדש או לחזור לדף הבית.",
      retry: "נסה שוב",
      home: "חזרה לדף הבית",
    },
    en: {
      title: "Something went wrong",
      body: "An unexpected error occurred. Our team has been notified and will look into it. Please try reloading or return to the homepage.",
      retry: "Try again",
      home: "Back to home",
    },
  }[lang];

  // Hard-coded brand palette (no Tailwind dependency)
  const colors = {
    charcoal: "#2D2926",
    charcoalLight: "#3D3733",
    bone: "#F3F2EE",
    boneDark: "#E8E7E3",
    warmGrayLight: "#D1CFCA",
    accent: "#8D775F",
  };

  return (
    <html lang={lang} dir={dir}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: colors.charcoal,
          color: colors.bone,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: colors.charcoalLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.accent}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: "30px",
              fontWeight: 600,
              margin: "0 0 16px",
              letterSpacing: "-0.025em",
            }}
          >
            {t.title}
          </h1>
          <p
            style={{
              color: colors.warmGrayLight,
              lineHeight: 1.6,
              margin: "0 0 32px",
              fontSize: "16px",
            }}
          >
            {t.body}
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                padding: "12px 24px",
                backgroundColor: colors.bone,
                color: colors.charcoal,
                border: "none",
                borderRadius: "8px",
                fontWeight: 500,
                fontSize: "15px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t.retry}
            </button>
            <a
              href={`/${lang}`}
              style={{
                padding: "12px 24px",
                backgroundColor: colors.charcoalLight,
                color: colors.bone,
                border: `1px solid ${colors.warmGrayLight}33`,
                borderRadius: "8px",
                fontWeight: 500,
                fontSize: "15px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {t.home}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
