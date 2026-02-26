import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Internal — Prime Steel Dashboard",
  robots: "noindex, nofollow",
};

const PrimeClient: any = dynamic(() => import("../binyan-eitan/DashboardClient"), { ssr: false });

export default function PrimePage() {
  return <PrimeClient company="Prime Steel" />;
}
