import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Binyan Eitan | Luxury Construction & Engineering",
  description: "Specializing in high-end residential construction, complex structural extensions, and precision engineering in Jerusalem.",
  metadataBase: new URL('https://binyaneitan.com'), // וודא שזה הדומיין שלך
  openGraph: {
    title: "Binyan Eitan | Premium Construction",
    description: "Building Excellence in Jerusalem since 2009.",
    url: 'https://binyaneitan.com',
    siteName: 'Binyan Eitan',
    images: [
      {
        url: '/ramat-eshkol.jpg', // תמונת פרויקט מרשימה עובדת טוב יותר מלוגו קטן בווטסאפ
        width: 1200,
        height: 630,
        alt: 'Binyan Eitan Luxury Construction',
      },
    ],
    locale: 'he_IL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Binyan Eitan',
    description: 'Luxury Construction & Engineering Jerusalem',
    images: ['/ramat-eshkol.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={`${inter.variable} ${playfair.variable} scroll-smooth`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
