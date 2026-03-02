import type { Metadata } from "next";
import NotFoundClient from "../components/ClientLayouts/NotFoundClient";

export const metadata: Metadata = {
  title: "404 — לבנה חסרה, לא דף",
  description: "הדף הזה לא קיים, אבל הפלסים שלנו מושלמים. שחקו ב-Crane Run בינתיים.",
  robots: "noindex, nofollow",
};

export default function HeNotFound() {
  return <NotFoundClient />;
}
