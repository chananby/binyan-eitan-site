import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "חידון יום העצמאות",
  description:
    'חידון יום העצמאות — היסטוריה, ציונות, מלחמות, מנהיגים וסמלים. 15 שאלות לחידוד הידע על הקמת המדינה.',
  robots: { index: false, follow: false },
  openGraph: {
    title: "חידון יום העצמאות",
    description:
      'חידון יום העצמאות — היסטוריה, ציונות, מלחמות, מנהיגים וסמלים. 15 שאלות לחידוד הידע על הקמת המדינה.',
    url: "https://binyaneitan.com/he/quizzes/independence",
    siteName: "בניין איתן",
    type: "website",
    images: [
      { url: "/og/independence-quiz.png", width: 1200, height: 630, alt: "חידון יום העצמאות" },
    ],
  },
};

export default function IndependenceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
