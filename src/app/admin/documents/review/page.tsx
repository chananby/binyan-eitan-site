import type { Metadata } from "next";
import ReviewQueueClient from "./ReviewQueueClient";

export const metadata: Metadata = {
  title: "סקירת אסמכתאות | בניין איתן",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function DocumentsReviewPage() {
  return <ReviewQueueClient />;
}
