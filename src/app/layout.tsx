import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";
import AccessibilityMenu from "./components/AccessibilityMenu";

const assistant = Assistant({
  subsets: ["latin", "hebrew"],
  variable: "--font-heading",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Binyan Eitan | Luxury Construction & Engineering",
  description: "Engineering beyond the surface. Binyan Eitan specializes in premium structural engineering and luxury construction.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className={assistant.variable}>
      {/* Gutter background — visible only outside the content frame on wide screens */}
      <body className="bg-[#E2DDD7] text-charcoal antialiased overflow-x-hidden selection:bg-accent selection:text-bone">
        {/* ── Architectural frame ────────────────────────────────────────────────
            Centres the site in a max-w-7xl box with subtle vertical border lines.
            On screens ≤ 1280 px the frame is full-width (no gutter visible).
        ──────────────────────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl bg-bone border-x border-[rgba(26,26,26,0.08)] min-h-screen">
          {children}
        </div>
        <AccessibilityMenu />
      </body>
    </html>
  );
}
