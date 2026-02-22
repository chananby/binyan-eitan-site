import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Binyan Eitan | Luxury Construction & Engineering Jerusalem",
  description: "Premier construction and engineering services in Jerusalem. Specializing in luxury residential, complex structural additions, and institutional projects since 1999. Approved contractor for the Western Wall Heritage Foundation.",
  keywords: ["Construction Jerusalem", "Luxury Homes Jerusalem", "Engineering Israel", "Binyan Eitan", "Building Additions", "Western Wall Heritage Foundation contractor"],
  openGraph: {
    title: "Binyan Eitan | Excellence in Construction",
    description: "Building Jerusalem's vision with engineering precision since 1999.",
    images: [{ url: '/ramat-eshkol.jpg' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
