import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "חידונים | בניין איתן",
  description: "חידונים תורניים ועונתיים של בניין איתן.",
  robots: { index: false, follow: false },
};

export default function QuizzesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
