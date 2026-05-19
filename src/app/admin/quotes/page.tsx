import type { Metadata } from "next";
import QuoteGeneratorClient from "./QuoteGeneratorClient";

export const metadata: Metadata = {
  title: "מחולל הצעות מחיר | בניין איתן",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function QuotesPage() {
  return <QuoteGeneratorClient />;
}
