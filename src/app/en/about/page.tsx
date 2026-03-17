import AboutPage from "../../components/AboutPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | The Engineering Expertise of Moti Eitan",
  description: "For two decades, Binyan Eitan has led complex and prestigious projects across Israel. Meet Moti Eitan — a C1 registered contractor with 20+ years of structural engineering, supervision and hands-on project management.",
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
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Binyan Eitan — The Firm" }],
    locale: "en_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Firm | Binyan Eitan",
    description: "Two decades of complex, luxury construction across Israel. G1 Registered Contractor.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://binyaneitan.com/en/about",
    languages: { he: "https://binyaneitan.com/he/about" },
  },
};

export default function EnAboutPage() {
  return <AboutPage />;
}
