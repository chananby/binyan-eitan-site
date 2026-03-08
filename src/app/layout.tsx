import type { Metadata } from "next";
import { Assistant, Heebo } from "next/font/google";
import "./globals.css";
import AccessibilityMenu from "./components/AccessibilityMenu";
import { TranslationsProvider } from "./components/TranslationsProvider";

const assistant = Assistant({
  subsets: ["latin", "hebrew"],
  variable: "--font-heading",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  variable: "--font-heebo",
  display: "swap",
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://binyaneitan.com"),
  title: {
    default: "Binyan Eitan | Engineering Excellence & Luxury Construction",
    template: "%s | Binyan Eitan",
  },
  description:
    "Precision you can measure, transparency you can trust. Binyan Eitan — G1-licensed contractor specializing in luxury builds, structural engineering, and premium finishes across Israel.",
  openGraph: {
    siteName: "Binyan Eitan",
    type: "website",
    images: [
      {
        url: "/amshinov-1.jpg",
        width: 1200,
        height: 800,
        alt: "Binyan Eitan — Engineering Excellence & Luxury Construction",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ConstructionBusiness",
  "name": "בנין איתן - הנדסה ובנייה",
  "description": "חברת בנייה והנדסה המתמחה בפרויקטים מורכבים, שלד, גמר וניהול פרויקטים ברמת פרימיום. קבלן רשום ג1.",
  "url": "https://www.binyaneitan.com",
  "telephone": "+972-2-500-0447",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Jerusalem",
    "addressCountry": "IL"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "31.7683",
    "longitude": "35.2137"
  },
  "areaServed": "Israel",
  "sameAs": [
    "https://www.linkedin.com/company/binyan-eitan",
    "https://www.facebook.com/binyaneitan",
    "https://www.gov.il/he/departments/general/registered-contractors"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "שירותי בנייה",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "הנדסת קונסטרוקציה ושלד"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "בניית וילות פרימיום"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "השבחה ושיפוץ פרימיום"
        }
      }
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="he" className={`${assistant.variable} ${heebo.variable}`}>
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Plausible Analytics — privacy-first, no cookies */}
        <script
          defer
          data-domain="binyaneitan.com"
          src="https://plausible.io/js/script.js"
        />
      </head>
      <body className="bg-bone text-charcoal antialiased overflow-x-hidden selection:bg-accent selection:text-bone">
        <TranslationsProvider>
          {children}
          <AccessibilityMenu />
        </TranslationsProvider>
      </body>
    </html>
  );
}
