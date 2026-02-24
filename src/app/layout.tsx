import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
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
    <html suppressHydrationWarning className={`${playfair.variable} ${montserrat.variable}`}>
      <body className="bg-bone text-charcoal antialiased overflow-x-hidden selection:bg-accent selection:text-bone">
        {children}
      </body>
    </html>
  );
}
