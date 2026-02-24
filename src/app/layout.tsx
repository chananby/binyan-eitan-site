import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";
 
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});
 
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
 
export const metadata: Metadata = {
  title: "Binyan Eitan — Engineering & Luxury Construction",
  description:
    "Premium engineering and luxury construction. Building legacies with precision.",
};
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${montserrat.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-bone text-charcoal">{children}</body>
    </html>
  );
}
