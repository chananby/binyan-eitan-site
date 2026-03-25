import type { Metadata } from "next";
import MathPinGate from "./components/MathPinGate";

export const metadata: Metadata = {
  title: "מתמטיקה — תוכנית המחוננים | בר-אילן",
  description: "אפליקציית תרגול מתמטיקה לכיתות ה׳–ו׳ — תוכנית המחוננים, אוניברסיטת בר-אילן",
  robots: "noindex, nofollow",
};

export default function MathAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="he" className="font-heebo">
      <MathPinGate>{children}</MathPinGate>
    </div>
  );
}
