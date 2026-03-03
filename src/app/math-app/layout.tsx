import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מתמטיקה — תוכנית המחוננים | בר-אילן",
  description: "אפליקציית תרגול מתמטיקה לכיתות ה׳–ו׳ — תוכנית המחוננים, אוניברסיטת בר-אילן",
  robots: "noindex, nofollow",
};

export default function MathAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Wrap in RTL div — root <html> is handled by binyan-eitan root layout,
  // but dir/lang are overridden here for the math-app subtree.
  return (
    <div dir="rtl" lang="he" className="font-heebo">
      {children}
    </div>
  );
}
