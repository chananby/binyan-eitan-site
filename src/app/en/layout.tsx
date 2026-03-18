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
    default: "Binyan Eitan | Engineering Excellence & Uncompromising Execution",
    template: "%s | Binyan Eitan",
  },
  description:
    "Two decades of engineering experience in construction, renovations, and complex project management in Jerusalem. Transforming technical plans into precise reality with full transparency.",
  openGraph: {
    siteName: "Binyan Eitan",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/luxury-interior-finish-transformation.jpg",
        width: 1600,
        height: 900,
        alt: "Binyan Eitan — Engineering Excellence & Uncompromising Execution",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: {
    canonical: "https://binyaneitan.co.il/en",
    languages: {
      "en-US": "https://binyaneitan.co.il/en",
      "he-IL": "https://binyaneitan.co.il/he",
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://binyaneitan.co.il",
  "name": "Binyan Eitan Ltd.",
  "alternateName": "בנין איתן בע\"מ",
  "url": "https://binyaneitan.co.il",
  "logo": "https://binyaneitan.co.il/logo.png",
  "image": "https://binyaneitan.co.il/luxury-interior-finish-transformation.jpg",
  "description": "G1-licensed construction contractor specializing in luxury renovation, structural engineering, and premium finishes across Jerusalem and central Israel.",
  "telephone": "02-500-0447",
  "contactPoint": [
    {
      "@type": "ContactPoint",
      "telephone": "+972-58-500-8447",
      "contactType": "sales and management",
      "availableLanguage": ["Hebrew", "English"]
    },
    {
      "@type": "ContactPoint",
      "telephone": "+972-53-321-4208",
      "contactType": "project coordination",
      "availableLanguage": ["Hebrew", "English"]
    }
  ],
  "email": "office@binyaneitan.co.il",
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
