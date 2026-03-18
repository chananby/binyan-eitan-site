import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Our Projects | Selected Portfolio of Premium Construction",
  description:
    "From institutional complexes to private luxury villas — every project built to engineering exactitude. Structural transparency, premium dark materials, precision you can walk through.",
  keywords: [
    "Construction Projects Israel",
    "Luxury Architecture",
    "Structural Engineering",
    "Amshinov Project",
    "Luxury Villas",
    "בנייה פרטית וציבורית",
  ],
  openGraph: {
    title: "Our Projects | Selected Portfolio of Premium Construction",
    description: "Institutional complexes, private villas, structural renovations. See what precision looks like.",
    url: "https://binyaneitan.com/en/projects",
    siteName: "Binyan Eitan",
    images: [{ url: "https://binyaneitan.com/amshinov-1.jpg", width: 1200, height: 800, alt: "Binyan Eitan — Engineering Projects Portfolio" }],
    locale: "en_IL",
    type: "website",
  },
  alternates: {
    canonical: "https://binyaneitan.com/en/projects",
    languages: { he: "https://binyaneitan.com/he/projects" },
  },
  robots: { index: true, follow: true },
};

const EnProjectsClient = dynamic(() => import("../../components/ClientLayouts/EnProjectsClient"), { ssr: false });

export default function ProjectsPageEN() {
  return <EnProjectsClient />;
}
