import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const IndependenceQuiz = dynamic(
  () => import('../../components/IndependenceQuiz'),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'חידון יום העצמאות',
  description: 'חידון יום העצמאות — היסטוריה, ציונות, מלחמות, מנהיגים וסמלים. 15 שאלות לחידוד הידע על הקמת המדינה.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'חידון יום העצמאות',
    description: 'חידון יום העצמאות — היסטוריה, ציונות, מלחמות, מנהיגים וסמלים. 15 שאלות לחידוד הידע על הקמת המדינה.',
    images: [{ url: '/og/independence-quiz.png', width: 1200, height: 630, alt: 'חידון יום העצמאות' }],
  },
};

export default function IndependenceQuizPage() {
  return <IndependenceQuiz />;
}
