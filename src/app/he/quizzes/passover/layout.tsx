import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "חידון פסח",
  description:
    'חידון פסח מושקע — הגדה, הלכות, מנהגים, תורה וחז"ל. עשר שאלות מעמיקות לחידוד הידע לפני החג.',
  robots: { index: false, follow: false },
  openGraph: {
    title: "חידון פסח",
    description:
      'חידון פסח מושקע — הגדה, הלכות, מנהגים, תורה וחז"ל. עשר שאלות מעמיקות לחידוד הידע לפני החג.',
    url: "https://binyaneitan.com/he/quizzes/passover",
    siteName: "בניין איתן",
    type: "website",
    images: [
      { url: "/og/passover-quiz.png", width: 1200, height: 630, alt: "חידון פסח" },
    ],
  },
};

export default function PassoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
