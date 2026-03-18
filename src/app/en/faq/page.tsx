import type { Metadata } from "next";
import FaqPage from "../../components/FaqPage";

export const metadata: Metadata = {
  title: "Common Questions",
  description:
    "Answers to frequently asked questions about construction projects, G1 licensing, remote project management, and more.",
  alternates: {
    canonical: "https://binyaneitan.co.il/en/faq",
    languages: {
      he: "https://binyaneitan.co.il/he/faq",
      en: "https://binyaneitan.co.il/en/faq",
    },
  },
};

export default function EnFaqPage() {
  return <FaqPage />;
}
