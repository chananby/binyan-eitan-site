import type { Metadata } from "next";
import NotFoundClient from "../components/ClientLayouts/NotFoundClient";

export const metadata: Metadata = {
  title: "404 — A Missing Brick, Not a Page",
  description: "This page doesn't exist, but our levels are perfect. Play the Crane Run while we sort it out.",
  robots: "noindex, nofollow",
};

export default function EnNotFound() {
  return <NotFoundClient />;
}
