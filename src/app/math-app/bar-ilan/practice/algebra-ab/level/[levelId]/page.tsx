"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSyncKey } from "@/src/lib/math-tests/attempts";
import {
  getPracticeModule,
  getPracticeLevel,
  getLevelProgress,
  upsertLevelProgress,
  resetLevelProgress,
} from "@/src/lib/math-tests/practice";
import { QuestionCard } from "@/src/app/math-app/bar-ilan/components/QuestionCard";
import type { PracticeQuestion, QuestionDetail, TestQuestion } from "@/src/types/math-test";

type Mode = "loading" | "practice" | "done" | "review";

function toTestQuestion(q: PracticeQuestion, idx: number): TestQuestion {
  return { ...q, number: idx + 1 };
}

export default function LevelPage() {
  const params = useParams();
  const router = useRouter();
  const levelId = params.levelId as string;

  const mod = getPracticeModule();
  const level = getPracticeLevel(levelId);

  const [mode, setMode] = useState<Mode>("loading");
  const [syncKey, setSyncKey] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, QuestionDetail>>({});
  const [reviewIdx, setReviewIdx] = useState(0);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!level) {
      router.replace("/math-app/bar-ilan/practice/algebra-ab");
      return;
    }
    const key = getSyncKey();
    setSyncKey(key);

    getLevelProgress(key, mod.slug, levelId).then((prog) => {
      const details = prog?.question_details ?? {};
      setSaved(details);
      const firstUnanswered = level.questions.findIndex((q) => !details[q.id]);
      if (firstUnanswered === -1) {
        setMode("done");
      } else {
        setCurrentIdx(firstUnanswered);
        setMode("practice");
      }
    });
  }, [levelId, level, mod.slug, router]);

  const doUpsert = useCallback(
    (newDetails: Record<string, QuestionDetail>, status: "in_progress" | "completed") => {
      if (!level || !syncKey) return;
      const correct = Object.values(newDetails).filter((d) => d.correct).length;
      upsertLevelProgress({
        syncKey,
        moduleSlug: mod.slug,
        levelId,
        questionsTotal: level.questions.length,
        questionsCorrect: correct,
        questionsAnswered: Object.keys(newDetails).length,
        questionDetails: newDetails,
        status,
        completedAt: status === "completed" ? new Date().toISOString() : undefined,
      });
    },
    [level, syncKey, mod.slug, levelId],
  );

  function handleSelect(label: string) {
    if (!level || selected !== null) return;
    const q = level.questions[currentIdx];
    const correct = label === q.correct_answer;
    const newDetails: Record<string, QuestionDetail> = {
      ...saved,
      [q.id]: { correct, selected: label },
    };
    setSaved(newDetails);
    setSelected(label);
    const allDone = Object.keys(newDetails).length === level.questions.length;
    doUpsert(newDetails, allDone ? "completed" : "in_progress");
  }

  function handleNext() {
    if (!level) return;
    if (currentIdx < level.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
    } else {
      setMode("done");
    }
  }

  async function handleReset() {
    if (!level || resetting) return;
    setResetting(true);
    await resetLevelProgress(syncKey, mod.slug, levelId);
    setSaved({});
    setSelected(null);
    setCurrentIdx(0);
    setResetting(false);
    setMode("practice");
  }

  if (!level) return null;

  const questions = level.questions;
  const totalCorrect = Object.values(saved).filter((d) => d.correct).length;
  const pct = Math.round((totalCorrect / questions.length) * 100);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (mode === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50">
        <p className="text-slate-400 text-sm">טוען...</p>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  if (mode === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 py-10 px-4" dir="rtl">
        <div className="max-w-md mx-auto space-y-6">

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <div className="text-5xl mb-4">{pct >= 75 ? "🌟" : "💪"}</div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-1">{level.name_he}</h2>
            <p className="text-4xl font-extrabold text-brand-600 my-4">{pct}%</p>
            <p className="text-sm text-slate-500">{totalCorrect} נכון מתוך {questions.length} שאלות</p>

            <div className="grid grid-cols-2 gap-3 mt-8">
              <button
                onClick={() => { setReviewIdx(0); setMode("review"); }}
                className="flex flex-col items-center gap-1 border border-brand-200 text-brand-700 rounded-xl py-3 px-4 font-bold hover:bg-brand-50 transition-colors text-sm"
              >
                <span>📋</span>
                <span>צפה בתשובות</span>
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex flex-col items-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl py-3 px-4 font-bold transition-colors text-sm"
              >
                <span>🔄</span>
                <span>{resetting ? "מאפס..." : "תרגל מחדש"}</span>
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/math-app/bar-ilan/practice/algebra-ab"
              className="flex-1 text-center text-sm font-semibold text-slate-600 hover:text-slate-800 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              ← תפריט
            </Link>
            {level.level_number < mod.levels_count ? (
              <Link
                href={`/math-app/bar-ilan/practice/algebra-ab/level/level-${level.level_number + 1}`}
                className="flex-1 text-center text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 py-3 rounded-xl transition-colors"
              >
                רמה {level.level_number + 1} ←
              </Link>
            ) : (
              <Link
                href="/math-app/bar-ilan/practice/algebra-ab/summary"
                className="flex-1 text-center text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 py-3 rounded-xl transition-colors"
              >
                סיכום כולל ←
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Review ─────────────────────────────────────────────────────────────────

  if (mode === "review") {
    const rq = questions[reviewIdx];
    const userAnswer = saved[rq.id]?.selected ?? null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 py-10 px-4" dir="rtl">
        <div className="max-w-xl mx-auto space-y-4">

          <div className="flex items-center justify-between">
            <button
              onClick={() => setMode("done")}
              className="text-sm text-brand-600 hover:text-brand-800 font-medium"
            >
              ← חזרה לתוצאות
            </button>
            <span className="text-xs text-slate-400 font-medium">{reviewIdx + 1} / {questions.length}</span>
          </div>

          <QuestionCard
            question={toTestQuestion(rq, reviewIdx)}
            questionIndex={reviewIdx}
            totalQuestions={questions.length}
            selected={userAnswer}
            onSelect={() => {}}
            showExplanation
            correctAnswer={rq.correct_answer}
          />

          <div className="flex gap-3">
            <button
              onClick={() => setReviewIdx((i) => Math.max(0, i - 1))}
              disabled={reviewIdx === 0}
              className="flex-1 py-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors text-sm"
            >
              ← הקודם
            </button>
            <button
              onClick={() => setReviewIdx((i) => Math.min(questions.length - 1, i + 1))}
              disabled={reviewIdx === questions.length - 1}
              className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold disabled:opacity-40 transition-colors text-sm"
            >
              הבא ←
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Practice ───────────────────────────────────────────────────────────────

  const currentQ = questions[currentIdx];
  const showFeedback = selected !== null;
  const isLast = currentIdx === questions.length - 1;
  const progressPct = ((currentIdx + (showFeedback ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 py-10 px-4" dir="rtl">
      <div className="max-w-xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/math-app/bar-ilan/practice/algebra-ab"
            className="text-sm text-brand-600 hover:text-brand-800 font-medium"
          >
            ← חזרה
          </Link>
          <p className="text-xs font-bold text-slate-500 text-center">{level.name_he}</p>
          <span className="text-xs text-slate-400 font-medium">
            {currentIdx + 1} / {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Question */}
        <QuestionCard
          question={toTestQuestion(currentQ, currentIdx)}
          questionIndex={currentIdx}
          totalQuestions={questions.length}
          selected={selected}
          onSelect={handleSelect}
          showExplanation={showFeedback}
          correctAnswer={currentQ.correct_answer}
        />

        {/* Next button — appears immediately after selection */}
        {showFeedback && (
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition-colors"
          >
            {isLast ? "סיום ←" : "הבא ←"}
          </button>
        )}
      </div>
    </div>
  );
}
