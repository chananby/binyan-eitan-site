import ExpertiseArticle from "../../components/ExpertiseArticle";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Luxury Construction & Engineering in Israel",
  description:
    "Building in Israel from abroad? Binyan Eitan is a G1 registered contractor bringing elite engineering and transparent project management to international clients.",
  alternates: {
    canonical: "https://binyaneitan.co.il/en/expertise",
    languages: { he: "https://binyaneitan.co.il/he/expertise" },
  },
  openGraph: {
    title: "Binyan Eitan | Building Your Israeli Property",
    description:
      "Building in Israel from abroad? Binyan Eitan is a G1 registered contractor bringing elite engineering and transparent project management to international clients.",
    url: "https://binyaneitan.co.il/en/expertise",
    siteName: "Binyan Eitan",
    locale: "en_US",
    type: "article",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Binyan Eitan — Luxury Construction & Engineering in Israel" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Binyan Eitan | Luxury Construction & Engineering in Israel",
    description:
      "Building in Israel from abroad? Binyan Eitan is a G1 registered contractor with 20+ years of elite engineering experience.",
    images: ["/og-image.jpg"],
  },
};

export default function EnExpertisePage() {
  return <ExpertiseArticle />;
}
