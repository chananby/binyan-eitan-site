import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Projects | Binyan Eitan — Luxury Construction & Engineering Israel",
  description:
    "Showcase of prestigious projects including commercial architecture, residential luxury villas, and complex structural engineering solutions.",
  keywords: [
    "Construction Projects Israel",
    "Luxury Architecture",
    "Structural Engineering",
    "Amshinov Project",
    "Luxury Villas",
    "בנייה פרטית וציבורית",
  ],
  openGraph: {
    title: "Projects | Binyan Eitan",
    description: "Portfolio of luxury construction and engineering projects across Israel.",
    url: "https://binyaneitan.com/en/projects",
    siteName: "Binyan Eitan",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Binyan Eitan — Projects" }],
    locale: "en_IL",
    type: "website",
  },
  alternates: {
    canonical: "https://binyaneitan.com/en/projects",
    languages: { he: "https://binyaneitan.com/he/projects" },
  },
  robots: "noindex, nofollow",
};

const EnProjectsClient = dynamic(() => import("../../components/ClientLayouts/EnProjectsClient"), { ssr: false });

export default function ProjectsPageEN() {
  return <EnProjectsClient />;
}
