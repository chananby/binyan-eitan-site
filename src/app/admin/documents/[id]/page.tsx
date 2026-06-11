import type { Metadata } from "next";
import DocumentDetailClient from "./DocumentDetailClient";

export const metadata: Metadata = {
  title: "סקירת אסמכתא | בניין איתן",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default async function DocumentDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <DocumentDetailClient id={id} />;
}
