"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAttempt } from "@/src/lib/math-tests/attempts";
import { getTestDefinition, getQuestionsByIds } from "@/src/lib/math-tests/loader";
import type { TestAttempt, TestQuestion, Answers, TopicBreakdown } from "@/src/types/math-test";
import { QuestionCard } from "../../components/QuestionCard";
import { TopicBreakdownChart } from "../../components/TopicBreakdown";

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const test = getTestDefinition();

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<"breakdown" | "review" | null>("breakdown");

  useEffect(() => {
    async function load() {
      let att: TestAttempt | null = null;

      if (attemptId.startsWith("offline-")) {
        const raw =
          sessionStorage.getItem(`result_${attemptId}`) ??
          sessionStorage.getItem(`attempt_${attemptId}`);
        att = raw ? (JSON.parse(raw) as TestAttempt) : null;
      } else {
        att = await getAttempt(attemptId);
      }

      if (att) {
        setAttempt(att);
        setQuestions(getQuestionsByIds(att.question_ids as string[]));
      }
      setLoading(false);
    }
    load();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50">
        <div className="text-brand-600 font-semibold animate-pulse">טוען תוצאות…</div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 gap-4" dir="rtl">
        <p className="text-slate-500">לא נמצאו תוצאות למבחן זה.</p>
        <Link href="/math-app/bar-ilan" className="text-brand-600 underline text-sm">
          חזרה למסך הפתיחה
        </Link>
      </div>
    );
  }

  const answers = attempt.answers as Answers;
  const breakdown = attempt.topic_breakdown as TopicBreakdown | undefined;
  const score = attempt.score_percentage ?? 0;
  const passed = score >= test.passing_threshold_percentage;
  const correctCount = attempt.correct_count ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Back */}
        <Link href="/math-app/bar-ilan" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 font-medium">
          ← חזרה
        </Link>

        {/* Score card */}
        <div
          className={`rounded-2xl p-8 text-center shadow-sm border ${
            passed
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="text-5xl mb-3">{passed ? "🏆" : "📈"}</div>
          <p
            className={`text-6xl font-black mb-2 ${
              passed ? "text-green-700" : "text-red-600"
            }`}
          >
            {score.toFixed(1)}%
          </p>
          <p
            className={`text-lg font-bold mb-1 ${
              passed ? "text-green-800" : "text-red-700"
            }`}
          >
            {passed ? "עברת את הסף!" : "עוד קצת ותצליח!"}
          </p>
          <p className="text-sm text-slate-500">
            {correctCount} נכונות מתוך {attempt.total_questions} שאלות
            {attempt.duration_seconds ? ` · ${formatDuration(attempt.duration_seconds)} דקות` : ""}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {attempt.is_simulation ? "סימולציה" : "תרגול מלא"} ·{" "}
            {attempt.completed_at
              ? new Date(attempt.completed_at).toLocaleDateString("he-IL")
              : "—"}
          </p>
        </div>

        {/* Topic breakdown */}
        {breakdown && Object.keys(breakdown).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <button
              onClick={() =>
                setExpandedSection(expandedSection === "breakdown" ? null : "breakdown")
              }
              className="w-full flex items-center justify-between p-5 text-right"
            >
              <span className="text-sm font-bold text-slate-700">ביצועים לפי נושא</span>
              <span className="text-slate-400 text-lg">
                {expandedSection === "breakdown" ? "▲" : "▼"}
              </span>
            </button>
            {expandedSection === "breakdown" && (
              <div className="px-5 pb-5">
                <TopicBreakdownChart breakdown={breakdown} />
              </div>
            )}
          </div>
        )}

        {/* Question review */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <button
            onClick={() =>
              setExpandedSection(expandedSection === "review" ? null : "review")
            }
            className="w-full flex items-center justify-between p-5 text-right"
          >
            <span className="text-sm font-bold text-slate-700">סקירת שאלות</span>
            <span className="text-slate-400 text-lg">
              {expandedSection === "review" ? "▲" : "▼"}
            </span>
          </button>
          {expandedSection === "review" && (
            <div className="px-4 pb-5 space-y-4">
              {questions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  questionIndex={idx}
                  totalQuestions={questions.length}
                  selected={answers[q.id] ?? null}
                  onSelect={() => {}}
                  showExplanation
                  correctAnswer={q.correct_answer}
                />
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/math-app/bar-ilan"
          className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl transition-colors"
        >
          מבחן נוסף
        </Link>

      </div>
    </div>
  );
}
