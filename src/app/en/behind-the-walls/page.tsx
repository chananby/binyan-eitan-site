import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Behind the Walls | Binyan Eitan",
  description: "An in-depth look at our engineering standards, infrastructure planning, and precision execution.",
  robots: "noindex, nofollow",
};

const EnBehindTheWallsClient = dynamic(() => import("../../components/ClientLayouts/EnBehindTheWallsClient"), { ssr: false });

export default function BehindTheWallsEN() {
  return <EnBehindTheWallsClient />;
}
