import type { Metadata } from "next";
import RootNotFoundWrapper from "./components/ClientLayouts/RootNotFoundWrapper";

export const metadata: Metadata = {
  title: { absolute: "404 | Binyan Eitan" },
  robots: { index: false, follow: false },
};

export default function RootNotFound() {
  return <RootNotFoundWrapper />;
}
