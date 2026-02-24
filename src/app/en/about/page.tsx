import AboutPage from "../../components/AboutPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Firm | Binyan Eitan",
  description:
    "For two decades, Binyan Eitan has led complex and prestigious projects across Israel. Meet Moti Eitan, founder and owner — 20+ years of engineering, supervision, and hands-on project management.",
};

export default function EnAboutPage() {
  return <AboutPage />;
}
