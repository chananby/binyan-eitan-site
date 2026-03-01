import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Common Questions | Binyan Eitan",
  description: "Common questions about our construction and engineering services.",
  robots: "noindex, nofollow",
};

const EnFAQClient = dynamic(() => import("../../components/ClientLayouts/EnFAQClient"), { ssr: false });

export default function FAQEnglish() {
  return <EnFAQClient />;
}
