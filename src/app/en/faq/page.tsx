import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "FAQ | Binyan Eitan",
  description: "Frequently asked questions about our construction services.",
  robots: "noindex, nofollow",
};

const EnFAQClient = dynamic(() => import("../../components/ClientLayouts/EnFAQClient"), { ssr: false });

export default function FAQEnglish() {
  return <EnFAQClient />;
}
