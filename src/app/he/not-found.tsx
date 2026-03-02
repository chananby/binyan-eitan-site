import type { Metadata } from "next";
import NotFoundClient from "../components/ClientLayouts/NotFoundClient";

export const metadata: Metadata = {
  title: "404 — הדף לא נמצא | בניין איתן",
};

export default function HeNotFound() {
  return <NotFoundClient />;
}
