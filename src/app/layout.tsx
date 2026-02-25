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
      <body className="bg-bone text-charcoal antialiased overflow-x-hidden selection:bg-accent selection:text-bone">
        {children}
        <AccessibilityMenu />
      </body>
    </html>
  );
}
