import type { Metadata } from "next";
import loadDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How to Read a Construction Quote",
  description:
    "The complete guide to reading a professional construction quote. How to spot 'gaps' in cheap proposals, why detail is your best protection, and what must appear in any contract.",
  alternates: {
    canonical: "https://binyaneitan.com/en/expertise/reading-a-professional-quote",
    languages: {
      "en": "https://binyaneitan.com/en/expertise/reading-a-professional-quote",
      "he": "https://binyaneitan.com/he/expertise/reading-a-professional-quote",
      "x-default": "https://binyaneitan.com/en/expertise/reading-a-professional-quote",
    },
  },
  openGraph: {
    title: "Beyond the Price: How to Read a Construction Quote | Binyan Eitan",
    description:
      "A professional quote is an engineering and legal blueprint. Binyan Eitan's guide to spotting red flags, understanding BOQs, and protecting your investment.",
    url: "https://binyaneitan.com/en/expertise/reading-a-professional-quote",
    siteName: "Binyan Eitan",
    locale: "en_US",
    type: "article",
    images: [
      {
        url: "/luxury-interior-finish-transformation.jpg",
        width: 1200,
        height: 800,
        alt: "Architectural plans and professional quote review — Binyan Eitan",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const ArticleDetailPage = loadDynamic(
  () => import("../../../components/ArticleDetailPage"),
);

export default function EnExpertiseReadingAQuotePage() {
  return <ArticleDetailPage slug="reading-a-professional-quote" />;
}
