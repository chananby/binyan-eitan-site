"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSyncKey } from "@/src/lib/math-tests/attempts";
import {
  getPracticeModule,
  getPracticeLevel,
  getNextLevelId,
  getLevelProgress,
  upsertLevelProgress,
  resetLevelProgress,
} from "@/src/lib/math-tests/practice";
import { toTestQuestion } from "@/src/lib/math-tests/adapters";
import { BidiText } from "@/src/lib/math-tests/bidi";
import { QuestionCard } from "@/src/app/math-app/bar-ilan/components/QuestionCard";
import type { QuestionDetail } from "@/src/types/math-test";

type Mode = "loading" | "intro" | "practice" | "done" | "review";

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3">
      <span className="text-red-400 shrink-0 text-lg">⚠️</span>
      <p className="text-sm text-red-700 flex-1 leading-snug">{message}</p>
      <button
        onClick={onDismiss}
        className="text-red-300 hover:text-red-500 shrink-0 text-lg leading-none"
        aria-label="סגור"
      >
        ✕
      </button>
    </div>
  );
}

export default function LevelPage() {
  const params = useParams();
  const router = useRouter();
  const moduleSlug = params.moduleSlug as string;
  const levelId = params.levelId as string;

  const mod = getPracticeModule(moduleSlug);
  const level = getPracticeLevel(moduleSlug, levelId);
  const base = `/math-app/bar-ilan/practice/${moduleSlug}`;

  const [mode, setMode] = useState<Mode>("loading");
  const [syncKey, setSyncKey] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, QuestionDetail>>({});
  const [reviewIdx, setReviewIdx] = useState(0);
  const [resetting, setResetting] = useState(false);

  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (!mod || !level) {
      router.replace("/math-app/bar-ilan");
      return;
    }
    const key = getSyncKey();
    setSyncKey(key);

    getLevelProgress(key, mod.slug, levelId).then(({ progress: prog, error }) => {
      if (error) {
        setLoadError(true);
        setCurrentIdx(0);
        setMode("practice");
        return;
      }
      const details = prog?.question_details ?? {};
      setSaved(details);
      const firstUnanswered = level.questions.findIndex((q) => !details[q.id]);
      if (firstUnanswered === -1) {
        setMode("done");
      } else {
        setCurrentIdx(firstUnanswered);
        const hasIntro = !!level.concept_he && Object.keys(details).length === 0;
        setMode(hasIntro ? "intro" : "practice");
      }
    });
  }, [levelId, level, mod, router]);

  const doUpsert = useCallback(
    async (newDetails: Record<string, QuestionDetail>, status: "in_progress" | "completed") => {
      if (!level || !mod || !syncKey) return;
      const correct = Object.values(newDetails).filter((d) => d.correct).length;
      const { error } = await upsertLevelProgress({
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
      if (error) setSaveError(true);
    },
    [level, mod, syncKey, levelId],
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
    setSaveError(false);
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
    if (!level || !mod || resetting) return;
    setResetting(true);
    await resetLevelProgress(syncKey, mod.slug, levelId);
    setSaved({});
    setSelected(null);
    setCurrentIdx(0);
    setLoadError(false);
    setSaveError(false);
    setResetting(false);
    setMode("practice");
  }

  if (!mod || !level) return null;

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

  // ── Intro ──────────────────────────────────────────────────────────────────

  if (mode === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 py-10 px-4" dir="rtl">
        <div className="max-w-xl mx-auto space-y-5">

          <div className="flex items-center justify-between">
            <Link
              href={base}
              className="text-sm text-brand-600 hover:text-brand-800 font-medium py-2.5"
            >
              ← חזרה
            </Link>
            <p className="text-xs font-bold text-slate-500">
              <BidiText text={level.name_he} />
            </p>
            <span className="w-12" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <p className="text-xs font-semibold text-brand-500 mb-2">📚 רקע לרמה</p>
            <p className="text-sm text-slate-700 leading-relaxed text-start">
              <BidiText text={level.concept_he} />
            </p>
          </div>

          {level.worked_examples_he.map((ex, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <p className="text-xs font-semibold text-amber-600 mb-2">
                ✏️ דוגמה פתורה{level.worked_examples_he.length > 1 ? ` ${i + 1}` : ""}
              </p>
              <p className="font-bold text-slate-800 leading-relaxed mb-4 text-start">
                <BidiText text={ex.prompt_he} />
              </p>
              <ol className="space-y-2 mb-4">
                {ex.steps_he.map((step, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center mt-0.5">{j + 1}</span>
                    <span className="flex-1 text-start"><BidiText text={step} /></span>
                  </li>
                ))}
              </ol>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                <span className="text-green-600 text-sm font-bold">תשובה:</span>
                <span className="text-green-800 font-bold text-sm">
                  <BidiText text={ex.answer_he} />
                </span>
              </div>
            </div>
          ))}

          <button
            onClick={() => setMode("practice")}
            className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            התחל לתרגל ←
          </button>
        </div>
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
            <h2 className="text-xl font-extrabold text-slate-800 mb-1">
              <BidiText text={level.name_he} />
            </h2>
            <p className={`text-4xl font-extrabold my-4 ${pct >= 75 ? "text-green-700" : "text-brand-600"}`}>{pct}%</p>
            <p className="text-sm text-slate-500">{totalCorrect} נכון מתוך {questions.length} שאלות</p>

            <div className="grid grid-cols-2 gap-3 mt-8">
              <button
                onClick={() => { setReviewIdx(0); setMode("review"); }}
                className="flex flex-col items-center gap-1 border border-brand-200 text-brand-700 rounded-xl py-3.5 px-4 font-bold hover:bg-brand-50 transition-colors text-sm"
              >
                <span>📋</span>
                <span>צפה בתשובות</span>
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex flex-col items-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl py-3.5 px-4 font-bold transition-colors text-sm"
              >
                <span>🔄</span>
                <span>{resetting ? "מאפס..." : "תרגל מחדש"}</span>
              </button>
            </div>
          </div>

          {(() => {
            const nextId = getNextLevelId(moduleSlug, levelId);
            return (
              <div className="flex gap-3">
                <Link
                  href={base}
                  className="flex-1 text-center text-sm font-semibold text-slate-600 hover:text-slate-800 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  ← תפריט
                </Link>
                {nextId ? (
                  <Link
                    href={`${base}/level/${nextId}`}
                    className="flex-1 text-center text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 py-3.5 rounded-xl transition-colors"
                  >
                    רמה {level.level_number + 1} ←
                  </Link>
                ) : (
                  <Link
                    href={`${base}/summary`}
                    className="flex-1 text-center text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 py-3.5 rounded-xl transition-colors"
                  >
                    סיכום כולל ←
                  </Link>
                )}
              </div>
            );
          })()}
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
              className="text-sm text-brand-600 hover:text-brand-800 font-medium py-2.5"
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
              className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors text-sm"
            >
              → הקודם
            </button>
            <button
              onClick={() => setReviewIdx((i) => Math.min(questions.length - 1, i + 1))}
              disabled={reviewIdx === questions.length - 1}
              className="flex-1 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold disabled:opacity-40 transition-colors text-sm"
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
            href={base}
            className="text-sm text-brand-600 hover:text-brand-800 font-medium py-2.5"
          >
            ← חזרה
          </Link>
          {level.concept_he ? (
            <button
              onClick={() => setMode("intro")}
              className="text-xs font-bold text-slate-500 hover:text-brand-600 text-center inline-flex items-center gap-1 py-2.5"
              aria-label="הצג מבוא לרמה"
            >
              <span>📖</span>
              <span><BidiText text={level.name_he} /></span>
            </button>
          ) : (
            <p className="text-xs font-bold text-slate-500 text-center">
              <BidiText text={level.name_he} />
            </p>
          )}
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

        {/* Error banners */}
        {loadError && (
          <ErrorBanner
            message="לא ניתן לטעון התקדמות קודמת. אתה מתחיל מאפס."
            onDismiss={() => setLoadError(false)}
          />
        )}
        {saveError && (
          <ErrorBanner
            message="ההתקדמות לא נשמרה. בדוק חיבור אינטרנט."
            onDismiss={() => setSaveError(false)}
          />
        )}

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

        {/* Next button */}
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
