import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import ErrorTrigger from "../../_dev/ErrorTrigger";

export const metadata: Metadata = {
  title: "Internal — Binyan Eitan Dashboard",
  robots: "noindex, nofollow",
};

const BinyanClient = dynamic(() => import("./DashboardClient"), { ssr: false });

export default function BinyanPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ErrorTrigger />
      </Suspense>
      <BinyanClient company="Binyan Eitan" />
    </>
  );
}
