import dynamic from "next/dynamic";

// ssr:false because the quiz uses framer-motion + browser-only APIs (Web
// Share, Audio). Same pattern as the other quiz pages under /he/quizzes/.
const IndependenceQuiz = dynamic(() => import("../../../components/IndependenceQuiz"), {
  ssr: false,
});

export default function IndependenceQuizPage() {
  return <IndependenceQuiz />;
}
