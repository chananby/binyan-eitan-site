import type { Metadata } from "next";
import DocumentsInboxClient from "./DocumentsInboxClient";

export const metadata: Metadata = {
  title: "אסמכתאות | בניין איתן",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function DocumentsPage() {
  return <DocumentsInboxClient />;
}
