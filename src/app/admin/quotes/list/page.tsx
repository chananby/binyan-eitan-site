import type { Metadata } from "next";
import dynamic from "next/dynamic";

const QuotesListClient = dynamic(() => import("./QuotesListClient"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "רשימת הצעות מחיר | בניין איתן",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function QuotesListPage() {
  return <QuotesListClient />;
}
