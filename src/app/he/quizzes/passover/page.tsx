import dynamic from "next/dynamic";

// ssr:false because the quiz uses framer-motion + browser-only APIs (Web
// Share, Audio, localStorage leaderboard).
const PassoverQuiz = dynamic(() => import("../../../components/PassoverQuiz"), {
  ssr: false,
});

export default function PassoverQuizPage() {
  return <PassoverQuiz />;
}
