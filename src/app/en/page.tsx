import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Engineering Excellence & Luxury Construction",
  description:
    "Precision you can measure, transparency you can trust. Binyan Eitan — G1-licensed contractor. Luxury builds, structural engineering, premium dark-material finishes. Jerusalem & across Israel.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Binyan Eitan | Engineering Excellence & Luxury Construction",
    description:
      "Every joint is calculated. Every finish is intentional. See the precision behind the walls.",
    url: "https://binyaneitan.com/en",
    siteName: "Binyan Eitan",
    type: "website",
    locale: "en_IL",
    images: [
      {
        url: "https://binyaneitan.com/amshinov-1.jpg",
        width: 1200,
        height: 800,
        alt: "Binyan Eitan — Luxury Construction & Engineering",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Binyan Eitan | Engineering Excellence",
    description: "Precision you can measure, transparency you can trust.",
    images: ["https://binyaneitan.com/amshinov-1.jpg"],
  },
};

const EnHomeClient = dynamic(() => import("../components/ClientLayouts/EnHomeClient"), { ssr: false });

export default function MaintenanceEnglish() {
  return <EnHomeClient />;
}
