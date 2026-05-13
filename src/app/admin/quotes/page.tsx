import type { Metadata } from "next";
import dynamic from "next/dynamic";

// ssr:false because the quote generator uses localStorage and window.print()
// which are browser-only. Matches the pattern used by AdminPortal.
const QuoteGeneratorClient = dynamic(() => import("./QuoteGeneratorClient"), {
  ssr: false,
});

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
