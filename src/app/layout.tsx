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
  metadataBase: new URL("https://binyaneitan.co.il"),
  title: {
    default: "Binyan Eitan | Engineering Excellence & Uncompromising Execution",
    template: "%s | Binyan Eitan",
  },
  description:
    "Two decades of engineering experience in construction, renovations, and complex project management in Jerusalem. Transforming technical plans into precise reality with full transparency.",
  openGraph: {
    siteName: "Binyan Eitan",
    type: "website",
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
  verification: {
    google: "B4UV2aj4j03bhNONfNmASSGyJGi3z-b8Gxd8DEaIGRM",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ConstructionBusiness",
  "name": "בנין איתן - הנדסה וביצוע",
  "description": "קבלן שיפוצים ובנייה בירושלים ובנימין — עבודה עברית מקצועית. שיפוץ דירות, בנייה ושיפוצים, הנדסת קונסטרוקציה וגמר פרימיום. קבלן רשום ג1 מס׳ 41805.",
  "url": "https://binyaneitan.co.il",
  "telephone": "02-500-0447",
  "contactPoint": [
    {
      "@type": "ContactPoint",
      "telephone": "058-500-8447",
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
  "areaServed": ["ירושלים", "בנימין", "מבשרת ציון", "גוש עציון", "בית שמש", "מרכז הארץ"],
  "sameAs": [
    "https://share.google/mYYDjEprxPi7JdoSG",
    "https://www.linkedin.com/company/binyan-eitan",
    "https://www.facebook.com/binyaneitan",
    "https://www.gov.il/he/departments/general/registered-contractors"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "שירותי בנייה ושיפוצים",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "קבלן שיפוצים בירושלים",
          "description": "שיפוץ דירות ובתים בירושלים ובנימין — עבודה עברית מקצועית"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "בנייה ושיפוצים",
          "description": "קבלן בנייה: שלד, תשתיות, גמר ופיקוח"
        }
      },
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
          "name": "בניית וילות פרימיום בירושלים"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "שיפוץ יוקרה ירושלים"
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Plausible Analytics — privacy-first, no cookies */}
        <script
          defer
          data-domain="binyaneitan.co.il"
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
