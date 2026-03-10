import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import { LangProvider } from "../components/LangContext";
import FloatingWhatsApp from "../components/FloatingWhatsApp";

const assistant = Assistant({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Binyan Eitan | G1-Licensed Contractor — Engineering & Luxury Construction",
    template: "%s | Binyan Eitan",
  },
  description:
    "G1-registered contractor (#41805) specializing in luxury renovation, structural engineering, and premium finishes across Jerusalem and central Israel. Full transparency, uncompromising execution.",
  openGraph: {
    siteName: "Binyan Eitan",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/jerusalem-luxury-living-room.jpg",
        width: 1200,
        height: 800,
        alt: "Binyan Eitan — Engineering & Luxury Construction",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: {
    canonical: "https://binyaneitan.com/en",
    languages: {
      "en-US": "https://binyaneitan.com/en",
      "he-IL": "https://binyaneitan.com/he",
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://binyaneitan.com",
  "name": "Binyan Eitan Ltd.",
  "alternateName": "בנין איתן בע\"מ",
  "url": "https://binyaneitan.com",
  "logo": "https://binyaneitan.com/logo.png",
  "image": "https://binyaneitan.com/jerusalem-crane-delivery.jpg",
  "description": "G1-licensed construction contractor specializing in luxury renovation, structural engineering, and premium finishes across Jerusalem and central Israel.",
  "telephone": ["+97225000447", "+972585008447"],
  "email": "office@binyaneitan.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Jerusalem",
    "addressCountry": "IL",
  },
  "areaServed": ["Jerusalem", "Tel Aviv", "Central Israel"],
  "priceRange": "$$$$",
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "G1 Contractor License",
    "name": "Registered Contractor G1 #41805",
  },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={assistant.variable}>
      <LangProvider lang="en" dir="ltr">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <FloatingWhatsApp />
      </LangProvider>
    </div>
  );
}
