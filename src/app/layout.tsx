import type { Metadata, Viewport } from "next";
import { Assistant, Heebo } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
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

// Mobile-browser chrome (status bar / address bar on Android Chrome,
// Safari iOS 15+) tinted to match the bone palette so the site reads as
// a continuous surface rather than ending at the OS edge.
export const viewport: Viewport = {
  themeColor: "#F3F2EE",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ConstructionBusiness",
  "@id": "https://binyaneitan.com/#business",
  "name": "Binyan Eitan",
  "alternateName": "בניין איתן",
  "description": "G1-licensed construction contractor specializing in luxury renovation, structural engineering, and complex project management in Jerusalem. Serving international clients building in Israel from abroad.",
  "url": "https://binyaneitan.com",
  "email": "office@binyaneitan.com",
  "telephone": "+972-2-500-0447",
  "founder": {
    "@type": "Person",
    "name": "Moti Eitan",
    "alternateName": "מוטי איתן",
    "jobTitle": "G1 Registered Contractor & Founder"
  },
  "hasCredential": {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "G1 Contractor License #41805",
    "recognizedBy": { "@type": "Organization", "name": "Contractors Registrar — Ministry of Construction & Housing, Israel" }
  },
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
  "areaServed": [
    "Jerusalem", "Benjamin", "Mevasseret Zion", "Gush Etzion", "Beit Shemesh", "Central Israel",
    "ירושלים", "בנימין", "מבשרת ציון", "גוש עציון", "בית שמש"
  ],
  "sameAs": [
    "https://share.google/mYYDjEprxPi7JdoSG",
    "https://www.linkedin.com/company/binyan-eitan",
    "https://www.facebook.com/binyaneitan",
    "https://www.gov.il/he/departments/general/registered-contractors"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Construction & Renovation Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Luxury Construction & Renovations Jerusalem",
          "description": "Full-scope luxury renovation and construction in Jerusalem — from structural engineering to premium finishes"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Remote Project Management for Overseas Clients",
          "description": "Transparent, tech-enabled project management for diaspora clients building in Israel from the US, UK, and Europe"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Structural Engineering & Civil Works"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Luxury Villas & Private Homes, Jerusalem"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Premium Finish — Tiling, Waterproofing, Painting"
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
  const pathname = headers().get("x-pathname") ?? "";
  const lang = pathname.startsWith("/en") ? "en" : "he";
  const dir  = lang === "en" ? "ltr" : "rtl";

  return (
    <html suppressHydrationWarning lang={lang} dir={dir} className={`${assistant.variable} ${heebo.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

      </head>
      <body className="bg-bone text-charcoal antialiased overflow-x-hidden selection:bg-accent selection:text-bone">
        {/* Skip link — visible only on keyboard focus; lets keyboard / screen-reader
            users jump past the nav directly to page content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-[1000] focus:bg-accent focus:text-bone focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:font-semibold focus:tracking-wider focus:uppercase focus:rounded-sm focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-bone"
        >
          {lang === "he" ? "דלג לתוכן" : "Skip to content"}
        </a>
        <TranslationsProvider>
          <div id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </div>
          <AccessibilityMenu />
        </TranslationsProvider>
        {/* Microsoft Clarity */}
        <Script id="clarity-init" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "w40c828o9d");
        `}</Script>
        {/* Google Analytics 4 */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-1CWQG6YY4H" strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-1CWQG6YY4H');
        `}</Script>
      </body>
    </html>
  );
}
