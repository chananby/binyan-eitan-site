import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Binyan Eitan - Engineering & Construction | Led by Moti Eitan",
  description:
    "Our new site is under construction, showcasing our complex engineering and luxury projects. In the meantime, we are available for any inquiries.",
  robots: "noindex, nofollow",
};

const EnHomeClient = dynamic(() => import("../components/ClientLayouts/EnHomeClient"), { ssr: false });

export default function MaintenanceEnglish() {
  return <EnHomeClient />;
}
