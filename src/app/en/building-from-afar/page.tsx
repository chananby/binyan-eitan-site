import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Building in Israel from Afar | Binyan Eitan",
  description: "Managing projects across a 7-hour difference with daily reports and international material integration.",
  robots: "noindex, nofollow",
};

const EnBuildingFromAfarClient = dynamic(() => import("../../components/ClientLayouts/EnBuildingFromAfarClient"), { ssr: false });

export default function BuildingFromAfarEN() {
  return <EnBuildingFromAfarClient />;
}
