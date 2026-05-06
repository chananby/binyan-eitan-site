import type { Metadata } from "next";
import RootNotFoundWrapper from "./components/ClientLayouts/RootNotFoundWrapper";

export const metadata: Metadata = {
  title: "404 | Binyan Eitan",
  robots: { index: false, follow: false },
};

export default function RootNotFound() {
  return <RootNotFoundWrapper />;
}
