import type { Metadata } from "next";
import BinyanClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Internal — Binyan Eitan Dashboard",
  robots: "noindex, nofollow",
};

export default function BinyanPage() {
  return <BinyanClient company="Binyan Eitan" />;
}
