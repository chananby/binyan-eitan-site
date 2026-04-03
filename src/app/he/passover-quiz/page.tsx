import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const PassoverQuiz = dynamic(() => import('../../components/PassoverQuiz'), { ssr: false });

export const metadata: Metadata = {
  title: 'חידון פסח',
  description: 'חידון פסח מושקע — הגדה, הלכות, מנהגים, תורה וחז"ל. עשר שאלות מעמיקות לחידוד הידע לפני החג.',
  robots: { index: false, follow: false },
};

export default function PassoverQuizPage() {
  return <PassoverQuiz />;
}
