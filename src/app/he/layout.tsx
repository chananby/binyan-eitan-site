import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import { LangProvider } from "../components/LangContext";

const assistant = Assistant({
  subsets: ["latin", "hebrew"],
  variable: "--font-heading",
  display: "swap",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "בנין איתן - פתרונות הנדסיים",
  description: "מומחים בבנייה ותשתיות",
};

export default function HeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={assistant.variable}>
      <LangProvider lang="he" dir="rtl">{children}</LangProvider>
    </div>
  );
}
