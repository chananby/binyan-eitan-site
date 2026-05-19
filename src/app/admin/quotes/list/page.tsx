import type { Metadata } from "next";
import QuotesListClient from "./QuotesListClient";

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
