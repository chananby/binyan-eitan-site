import type { Metadata } from "next";
import PrimeClient from "../binyan-eitan/DashboardClient";

export const metadata: Metadata = {
  title: "Internal — Prime Steel Dashboard",
  robots: "noindex, nofollow",
};

export default function PrimePage() {
  return <PrimeClient company="Prime Steel" />;
}
