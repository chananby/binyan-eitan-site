import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";

// טעינת פונט הכותרות - כולל תמיכה חובה בעברית ובמשקלים מרובים
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

// טעינת פונט הטקסט הרץ - כולל תמיכה חובה בעברית
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

// תשתית SEO יוקרתית למנועי חיפוש (גוגל)
export const metadata: Metadata = {
  title: "Binyan Eitan | Luxury Construction & Engineering",
  description: "Engineering beyond the surface. Binyan Eitan specializes in premium structural engineering, luxury construction, and high-end renovations.",
  keywords: ["Luxury Construction", "Engineering", "Israel", "Binyan Eitan", "בנייה יוקרתית", "הנדסת מבנים", "בניין איתן"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="he" 
      dir="rtl" 
      className={`${playfair.variable} ${montserrat.variable}`} 
      suppressHydrationWarning
    >
      <body className="bg-bone text-charcoal antialiased overflow-x-hidden selection:bg-accent selection:text-bone">
        {children}
      </body>
    </html>
  );
}
