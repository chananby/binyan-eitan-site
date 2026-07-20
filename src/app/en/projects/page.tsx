import type { Metadata } from "next";
import ProjectsGallery from "../../components/ProjectsGallery";
// Source of truth for "does a detail page exist" — the same list the
// [slug] route generates its pages from. Passed down so the client
// component never imports the rich project content.
import { PROJECT_SLUGS } from "../../../data/projects";

export const metadata: Metadata = {
  title: "Our Projects | Selected Portfolio of Premium Construction",
  description:
    "From institutional complexes to private luxury renovations — every project built to engineering exactitude. Structural transparency, premium finishes, precision you can walk through.",
  openGraph: {
    title: "Our Projects | Selected Portfolio of Premium Construction",
    description: "Institutional complexes, private villas, structural renovations. See what precision looks like.",
    url: "https://binyaneitan.com/en/projects",
    siteName: "Binyan Eitan",
    images: [{ url: "https://binyaneitan.com/amshinov-1.jpg", width: 1200, height: 800, alt: "Binyan Eitan — Engineering Projects Portfolio" }],
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "https://binyaneitan.com/en/projects",
    languages: {
      en: "https://binyaneitan.com/en/projects",
      he: "https://binyaneitan.com/he/projects",
      "x-default": "https://binyaneitan.com/en/projects",
    },
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://binyaneitan.com/en/projects",
  name: "Our Projects | Binyan Eitan",
  description:
    "Selected portfolio of construction and renovation projects by Binyan Eitan — Jerusalem-based G1 contractor.",
  url: "https://binyaneitan.com/en/projects",
  inLanguage: "en",
  publisher: {
    "@type": "LocalBusiness",
    name: "Binyan Eitan Ltd.",
    url: "https://binyaneitan.com",
  },
};

export default function ProjectsPageEN() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProjectsGallery lang="en" detailSlugs={PROJECT_SLUGS} />
    </>
  );
}
