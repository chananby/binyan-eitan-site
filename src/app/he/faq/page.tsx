import type { Metadata } from "next";
import FaqPage from "../../components/FaqPage";
import translations from "../../../lib/translations.json";

export const metadata: Metadata = {
  title: "שאלות נפוצות",
  description:
    "תשובות לשאלות הנפוצות ביותר בנושאי פרויקטי בנייה, רישיון ג1, ניהול פרויקטים מרחוק ועוד.",
  openGraph: {
    title: "שאלות נפוצות | בניין איתן",
    description: "תשובות לשאלות הנפוצות ביותר בנושאי בנייה, רישוי וניהול פרויקטים.",
    url: "https://binyaneitan.com/he/faq",
    siteName: "בניין איתן",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/luxury-interior-finish-transformation.jpg", width: 1600, height: 900, alt: "בניין איתן — שאלות נפוצות" }],
  },
  alternates: {
    canonical: "https://binyaneitan.com/he/faq",
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
    name: faq.question_he,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer_he.replace(/\n/g, " "),
    },
  })),
};

export default function HeFaqPage() {
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
