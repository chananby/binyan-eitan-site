import type { Metadata } from "next";
import FaqPage from "../../components/FaqPage";
import translations from "../../../lib/translations.json";

export const metadata: Metadata = {
  title: "Common Questions",
  description:
    "Answers to frequently asked questions about construction projects, G1 licensing, remote project management, and more.",
  openGraph: {
    title: "Common Questions | Binyan Eitan",
    description: "Answers to the most frequent questions about construction, G1 licensing, and remote project management.",
    url: "https://binyaneitan.com/en/faq",
    siteName: "Binyan Eitan",
    locale: "en_US",
    type: "website",
    images: [{ url: "/luxury-interior-finish-transformation.jpg", width: 1600, height: 900, alt: "Binyan Eitan — Common Questions" }],
  },
  alternates: {
    canonical: "https://binyaneitan.com/en/faq",
    languages: {
      he: "https://binyaneitan.com/he/faq",
      en: "https://binyaneitan.com/en/faq",
    },
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: translations.faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question_en,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer_en.replace(/\n/g, " "),
    },
  })),
};

export default function EnFaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <FaqPage />
    </>
  );
}
