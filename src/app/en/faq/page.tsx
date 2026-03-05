import type { Metadata } from "next";
import FaqPage from "../../components/FaqPage";

export const metadata: Metadata = {
  title: "Common Questions | Binyan Eitan",
  description:
    "Answers to frequently asked questions about construction projects, G1 licensing, remote project management, and more.",
  alternates: {
    canonical: "https://binyaneitan.com/en/faq",
    languages: {
      he: "https://binyaneitan.com/he/faq",
      en: "https://binyaneitan.com/en/faq",
    },
  },
};

export default function EnFaqPage() {
  return <FaqPage />;
}
