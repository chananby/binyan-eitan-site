import AboutPage from "../../components/AboutPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | The Engineering Expertise of Moti Eitan",
  description: "For two decades, Binyan Eitan has led complex and prestigious projects across Israel. Meet Moti Eitan — a G1 registered contractor with 20+ years of structural engineering, supervision and hands-on project management.",
  keywords: [
    "Construction Engineering Israel",
    "G1 Registered Contractor",
    "Moti Eitan Contractor",
    "Structural Engineering Israel",
    "Luxury Construction Firm Israel",
    "בנייה פרטית וציבורית",
  ],
  openGraph: {
    title: "About Us | The Engineering Expertise of Moti Eitan",
    description: "Two decades of complex, luxury construction across Israel. G1 Registered Contractor led by founder Moti Eitan.",
    url: "https://binyaneitan.com/en/about",
    siteName: "Binyan Eitan",
    images: [{ url: "/luxury-interior-finish-transformation.jpg", width: 1600, height: 900, alt: "Binyan Eitan — The Firm" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Firm | Binyan Eitan",
    description: "Two decades of complex, luxury construction across Israel. G1 Registered Contractor.",
    images: ["/luxury-interior-finish-transformation.jpg"],
  },
  alternates: {
    canonical: "https://binyaneitan.com/en/about",
    languages: {
      "en-US":     "https://binyaneitan.com/en/about",
      "he-IL":     "https://binyaneitan.com/he/about",
      "x-default": "https://binyaneitan.com/en/about",
    },
  },
};

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Us | Binyan Eitan",
  description: "Two decades of complex, luxury construction across Israel. G1 Registered Contractor led by founder Moti Eitan.",
  url: "https://binyaneitan.com/en/about",
  inLanguage: "en-US",
  about: {
    "@type": "Organization",
    name: "Binyan Eitan",
    alternateName: "בניין איתן",
    url: "https://binyaneitan.com",
    logo: "https://binyaneitan.com/logo.png",
    description: "Jerusalem-based construction and renovation firm led by Moti Eitan — a G1 registered contractor with 20+ years of experience in high-end residential and private construction.",
    foundingDate: "2004",
    founder: {
      "@type": "Person",
      name: "Moti Eitan",
      jobTitle: "Founder & Owner",
    },
    areaServed: { "@type": "Country", name: "Israel" },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+972-58-500-8447",
      contactType: "customer service",
      availableLanguage: ["Hebrew", "English", "Russian"],
    },
    sameAs: ["https://binyaneitan.com"],
  },
};

export default function EnAboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <AboutPage />
    </>
  );
}
