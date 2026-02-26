import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Internal — Binyan Eitan Dashboard",
  robots: "noindex, nofollow",
};

const BinyanClient = dynamic(() => import("./DashboardClient"), { ssr: false });

export default function BinyanPage() {
  return <BinyanClient company="Binyan Eitan" />;
}
