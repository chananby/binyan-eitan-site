"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAttempt, saveAnswers, completeAttempt } from "@/src/lib/math-tests/attempts";
import { getTestDefinition, getQuestionsByIds } from "@/src/lib/math-tests/loader";
import type { TestAttempt, TestQuestion, Answers, TopicBreakdown } from "@/src/types/math-test";
import { QuestionCard } from "../../components/QuestionCard";
import { NavDots } from "../../components/NavDots";
import { Timer } from "../../components/Timer";

function computeTopicBreakdown(
  questions: TestQuestion[],
  answers: Answers,
): TopicBreakdown {
  const breakdown: TopicBreakdown = {};
  for (const q of questions) {
    if (!breakdown[q.topic]) breakdown[q.topic] = { correct: 0, total: 0 };
    const a = answers[q.id];
    if (a !== undefined) {
      breakdown[q.topic].total += 1;
      if (a === q.correct_answer) breakdown[q.topic].correct += 1;
    }
  }
  return breakdown;
}

export default function TestPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const test = getTestDefinition();

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load attempt (DB or session storage fallback)
  useEffect(() => {
    async function load() {
      let att: TestAttempt | null = null;

      if (attemptId.startsWith("offline-")) {
        const raw = sessionStorage.getItem(`attempt_${attemptId}`);
        att = raw ? (JSON.parse(raw) as TestAttempt) : null;
      } else {
        att = await getAttempt(attemptId);
      }

      if (!att) {
        router.replace("/math-app/bar-ilan");
        return;
      }

      const qs = getQuestionsByIds(att.question_ids as string[]);
      const elapsed = att.started_at
        ? Math.floor((Date.now() - new Date(att.started_at).getTime()) / 1000)
        : 0;

      setAttempt(att);
      setQuestions(qs);
      setAnswers(att.answers as Answers);
      setElapsedSeconds(elapsed);
      setLoading(false);

      // Start at first unanswered question
      const firstUnanswered = qs.findIndex((q) => !(att!.answers as Answers)[q.id]);
      setCurrentIdx(firstUnanswered >= 0 ? firstUnanswered : 0);
    }
    load();
  }, [attemptId, router]);

  const debouncedSave = useCallback(
    (newAnswers: Answers) => {
      if (attemptId.startsWith("offline-")) {
        // Update session storage
        if (attempt) {
          const updated = { ...attempt, answers: newAnswers, answered_count: Object.keys(newAnswers).length };
          sessionStorage.setItem(`attempt_${attemptId}`, JSON.stringify(updated));
        }
        return;
      }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveAnswers(attemptId, newAnswers), 800);
    },
    [attemptId, attempt],
  );

  function handleSelect(label: string) {
    const q = questions[currentIdx];
    if (!q) return;
    const newAnswers = { ...answers, [q.id]: label };
    setAnswers(newAnswers);
    debouncedSave(newAnswers);
  }

  async function handleFinish() {
    if (submitting) return;
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      const ok = window.confirm(
        `ענית על ${questions.length - unanswered.length} מתוך ${questions.length} שאלות. לסיים בכל זאת?`,
      );
      if (!ok) return;
    }
    setSubmitting(true);

    const correctCount = questions.filter((q) => answers[q.id] === q.correct_answer).length;
    const scorePercentage = parseFloat(((correctCount / questions.length) * 100).toFixed(2));
    const durationSeconds = Math.floor(
      (Date.now() - new Date(attempt!.started_at).getTime()) / 1000,
    );
    const topicBreakdown = computeTopicBreakdown(questions, answers);

    if (!attemptId.startsWith("offline-")) {
      await completeAttempt({
        attemptId,
        answers,
        correctCount,
        scorePercentage,
        durationSeconds,
        topicBreakdown,
      });
    } else {
      // Store results in sessionStorage for results page
      const resultKey = `result_${attemptId}`;
      sessionStorage.setItem(
        resultKey,
        JSON.stringify({
          ...attempt,
          status: "completed",
          answers,
          answered_count: Object.keys(answers).length,
          correct_count: correctCount,
          score_percentage: scorePercentage,
          duration_seconds: durationSeconds,
          topic_breakdown: topicBreakdown,
          completed_at: new Date().toISOString(),
        }),
      );
    }

    router.push(`/math-app/bar-ilan/results/${attemptId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50">
        <div className="text-brand-600 font-semibold animate-pulse">טוען מבחן…</div>
      </div>
    );
  }

  if (!attempt) return null;

  const currentQuestion = questions[currentIdx];
  const answeredIds = new Set(Object.keys(answers));
  const answeredCount = answeredIds.size;
  const isSimulation = attempt.is_simulation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 py-6 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/math-app/bar-ilan" className="text-sm text-slate-400 hover:text-slate-600 font-medium">
            ← יציאה
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 font-medium">
              {answeredCount}/{questions.length} נענו
            </span>
            {isSimulation && (
              <Timer
                totalSeconds={test.duration_seconds}
                elapsedSeconds={elapsedSeconds}
                onExpire={handleFinish}
              />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            questionIndex={currentIdx}
            totalQuestions={questions.length}
            selected={answers[currentQuestion.id] ?? null}
            onSelect={handleSelect}
          />
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium disabled:opacity-30 hover:border-brand-300 transition-colors"
          >
            → קודם
          </button>
          <button
            onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
            disabled={currentIdx === questions.length - 1}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium disabled:opacity-30 hover:border-brand-300 transition-colors"
          >
            ← הבא
          </button>
        </div>

        {/* Nav dots */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <NavDots
            total={questions.length}
            current={currentIdx}
            answered={answeredIds}
            questionIds={questions.map((q) => q.id)}
            onNavigate={setCurrentIdx}
          />
        </div>

        {/* Finish */}
        <button
          onClick={handleFinish}
          disabled={submitting}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors"
        >
          {submitting ? "שומר תוצאות…" : "סיים מבחן"}
        </button>

      </div>
    </div>
  );
}
