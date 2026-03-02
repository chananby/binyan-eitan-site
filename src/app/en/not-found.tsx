import type { Metadata } from "next";
import NotFoundClient from "../components/ClientLayouts/NotFoundClient";

export const metadata: Metadata = {
  title: "404 — Page Not Found | Binyan Eitan",
};

export default function EnNotFound() {
  return <NotFoundClient />;
}
