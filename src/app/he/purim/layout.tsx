import type { Metadata } from "next";

// ── Purim-specific meta — overrides the global he/layout metadata ─────────────
export const metadata: Metadata = {
  title: "חידון פורים הגדול",
  description:
    "החידון הגדול בשני שלבים! בואו לבחון את הידע שלכם — מהבסיס ועד למדרשים העמוקים.",
  openGraph: {
    title: "חידון פורים — בניין איתן",
    description:
      "החידון הגדול בשני שלבים! בואו לבחון את הידע שלכם — מהבסיס ועד למדרשים העמוקים.",
    url: "https://binyaneitan.com/he/purim",
    siteName: "בניין איתן",
    type: "website",
    images: [
      {
        url: "https://upload.wikimedia.org/wikipedia/commons/3/36/Megillah_1.JPG",
        width: 600,
        height: 600,
        type: "image/jpeg",
        alt: "מגילת אסתר — חידון פורים בניין איתן",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "חידון פורים הגדול | בניין איתן",
    description: "החידון הגדול בשני שלבים! בואו לבחון את הידע שלכם.",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/3/36/Megillah_1.JPG",
    ],
  },
};

// No Navbar, no Footer, no global branding — just the children.
export default function PurimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
