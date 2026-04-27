import type { Metadata } from "next";
import EnHomeClient from "../components/ClientLayouts/EnHomeClient";

export const metadata: Metadata = {
  title: { absolute: "Binyan Eitan | Engineering & Luxury Construction in Jerusalem" },
  description:
    "G1-registered contractor — complex project execution in Jerusalem & the Benjamin region. Civil engineering, luxury construction, premium finishes. Binyan Eitan: precision you can measure.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://binyaneitan.com/en",
    languages: { he: "https://binyaneitan.com/he" },
  },
  openGraph: {
    title: "Binyan Eitan | Engineering & Luxury Construction in Jerusalem",
    description:
      "Every joint is calculated. Every finish is intentional. See the precision behind the walls.",
    url: "https://binyaneitan.com/en",
    siteName: "Binyan Eitan",
    type: "website",
    locale: "en_US",
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

const enLocalBusiness = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ConstructionBusiness"],
  "name": "Binyan Eitan",
  "alternateName": "בניין איתן",
  "founder": { "@type": "Person", "name": "Moti Eitan", "jobTitle": "G1 Registered Contractor & Founder" },
  "description": "G1-registered contractor #41805. Complex project execution in Jerusalem — civil engineering, structural construction, luxury renovations, and premium finish work.",
  "url": "https://binyaneitan.com",
  "telephone": "+972-2-500-0447",
  "address": { "@type": "PostalAddress", "addressLocality": "Jerusalem", "addressCountry": "IL" },
  "geo": { "@type": "GeoCoordinates", "latitude": "31.7683", "longitude": "35.2137" },
  "areaServed": ["Jerusalem", "Benjamin", "Mevasseret Zion", "Gush Etzion", "Beit Shemesh", "Central Israel"],
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "G1 Contractor License #41805",
    "recognizedBy": { "@type": "Organization", "name": "Contractors Registrar — Ministry of Construction & Housing, Israel" },
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Construction & Renovation Services",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Luxury Construction & Renovations, Jerusalem" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Complex Project Execution & Management" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Civil Engineering & Structural Work" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Luxury Villas & Private Homes" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Premium Finish — Tiling, Waterproofing, Painting" } },
    ],
  },
  "sameAs": ["https://share.google/mYYDjEprxPi7JdoSG", "https://www.facebook.com/binyaneitan"],
};


export default function MaintenanceEnglish() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(enLocalBusiness) }} />
      <EnHomeClient />
    </>
  );
}
