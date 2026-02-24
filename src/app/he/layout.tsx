import type { Metadata } from "next";
import { LangProvider } from "../components/LangContext";

export const metadata: Metadata = {
  title: "בנין איתן - פתרונות הנדסיים",
  description: "מומחים בבנייה ותשתיות",
};

export default function HeLayout({ children }: { children: React.ReactNode }) {
  return <LangProvider lang="he" dir="rtl">{children}</LangProvider>;
}
