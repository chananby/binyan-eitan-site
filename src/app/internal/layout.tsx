import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Internal — Management Dashboards",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

const InternalClient = dynamic(() => import("./InternalClientLayout"), { ssr: false });

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <InternalClient>{children}</InternalClient>;
}
