import type { Metadata } from "next";
import TriageClient from "./TriageClient";

export const metadata: Metadata = {
  title: "טריאז' אסמכתאות | בניין איתן",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function DocumentsTriagePage() {
  return <TriageClient />;
}
