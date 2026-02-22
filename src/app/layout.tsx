import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Binyan Eitan | Luxury Construction & Engineering Jerusalem",
  description: "Specializing in high-end residential construction, complex floor extensions, and precision engineering in Jerusalem. Setting a new standard of excellence.",
  openGraph: {
    title: "Binyan Eitan | Premium Construction",
    description: "Discover our latest luxury projects in Jerusalem.",
    images: [{ url: '/ramat-eshkol.jpg', width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} scroll-smooth`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
