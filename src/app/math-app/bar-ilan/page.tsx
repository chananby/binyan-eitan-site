"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getSyncKey,
  getInProgressAttempt,
  getHistory,
  getProgress,
  startAttempt,
} from "@/src/lib/math-tests/attempts";
import {
  getTestDefinition,
  pickSimulationQuestions,
  getAllQuestions,
} from "@/src/lib/math-tests/loader";
import { BidiText } from "@/src/lib/math-tests/bidi";
import type { TestAttempt, TestProgress } from "@/src/types/math-test";

export default function BarIlanLanding() {
  const router = useRouter();
  const test = getTestDefinition();

  const [syncKey, setSyncKey] = useState("");
  const [inProgress, setInProgress] = useState<TestAttempt | null>(null);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [history, setHistory] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<"sim" | "full" | null>(null);

  useEffect(() => {
    const key = getSyncKey();
    setSyncKey(key);

    Promise.all([
      getInProgressAttempt(key, test.slug),
      getProgress(key, test.slug),
      getHistory(key, test.slug, 5),
    ]).then(([ip, prog, hist]) => {
      setInProgress(ip);
      setProgress(prog);
      setHistory(hist);
      setLoading(false);
    });
  }, [test.slug]);

  async function handleStart(mode: "sim" | "full") {
    setStarting(mode);
    const isSimulation = mode === "sim";
    const questionIds = isSimulation
      ? pickSimulationQuestions(test.official_question_count)
      : getAllQuestions().map((q) => q.id);

    const attempt = await startAttempt({
      syncKey,
      testSlug: test.slug,
      testName: test.name_he,
      questionIds,
      isSimulation,
    });

    if (attempt) {
      router.push(`/math-app/bar-ilan/test/${attempt.id}`);
    } else {
      // Offline fallback: store locally and navigate with a temp ID
      const tempId = "offline-" + Date.now();
      sessionStorage.setItem(
        `attempt_${tempId}`,
        JSON.stringify({
          id: tempId,
          sync_key: syncKey,
          test_slug: test.slug,
          test_name: test.name_he,
          question_ids: questionIds,
          total_questions: questionIds.length,
          is_simulation: isSimulation,
          status: "in_progress",
          answers: {},
          answered_count: 0,
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      );
      router.push(`/math-app/bar-ilan/test/${tempId}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 py-10 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back */}
        <Link href="/math-app" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 font-medium py-2.5">
          ← חזרה
        </Link>

        {/* Hero card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
          <div className="flex items-start gap-4 mb-5">
            <span className="text-4xl">🎓</span>
            <div>
              <p className="text-xs font-semibold text-brand-500 mb-1">
                אוניברסיטת בר-אילן · תוכנית לנוער מוכשר במתמטיקה
              </p>
              <h1 className="text-xl font-extrabold text-slate-800 leading-snug">
                {test.name_he}
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            {test.description_he}
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 bg-brand-50 rounded-xl">
              <p className="text-2xl font-extrabold text-brand-700">{test.official_question_count}</p>
              <p className="text-xs text-brand-500 mt-0.5">שאלות בסימולציה</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-extrabold text-slate-700">60</p>
              <p className="text-xs text-slate-500 mt-0.5">דקות</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-extrabold text-slate-700">{test.passing_threshold_percentage}%</p>
              <p className="text-xs text-slate-500 mt-0.5">ציון עובר</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">הוראות</p>
            <ul className="space-y-1.5">
              {test.instructions_he.map((inst, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-brand-400 mt-0.5 shrink-0">•</span>
                  {inst}
                </li>
              ))}
            </ul>
          </div>

          {/* Resume in-progress */}
          {inProgress && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-bold text-amber-800 mb-1">יש לך מבחן פתוח</p>
              <p className="text-xs text-amber-600 mb-3">
                ענית על {inProgress.answered_count} מתוך {inProgress.total_questions} שאלות
              </p>
              <Link
                href={`/math-app/bar-ilan/test/${inProgress.id}`}
                className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                המשך מבחן ←
              </Link>
            </div>
          )}

          {/* Start buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleStart("sim")}
              disabled={!!starting}
              className="flex flex-col items-center gap-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl py-4 px-5 font-bold transition-colors"
            >
              <span className="text-lg">🎯</span>
              <span>סימולציה</span>
              <span className="text-xs font-normal opacity-80">
                {starting === "sim" ? "מתחיל..." : `${test.official_question_count} שאלות · 60 דקות`}
              </span>
            </button>
            <button
              onClick={() => handleStart("full")}
              disabled={!!starting}
              className="flex flex-col items-center gap-1 bg-white hover:bg-slate-50 disabled:opacity-60 border border-brand-200 text-brand-700 rounded-xl py-4 px-5 font-bold transition-colors"
            >
              <span className="text-lg">📚</span>
              <span>תרגול מלא</span>
              <span className="text-xs font-normal opacity-60">
                {starting === "full" ? "מתחיל..." : `${test.bank_question_count} שאלות · ללא שעון`}
              </span>
            </button>
          </div>
        </div>

        {/* Practice module card */}
        <Link
          href="/math-app/bar-ilan/practice/algebra-ab"
          className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-sm transition-all"
        >
          <span className="text-3xl shrink-0">✏️</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-600 mb-0.5">תרגול ממוקד</p>
            <p className="font-bold text-slate-800 text-sm">
              <BidiText text="תרגול ממוקד: ביטויים אלגבריים (a/b)" />
            </p>
            <p className="text-xs text-slate-500 mt-0.5">3 רמות · 24 שאלות · משוב מיידי</p>
          </div>
          <span className="text-amber-400 text-lg shrink-0">←</span>
        </Link>

        {/* Progress */}
        {!loading && progress && progress.attempts_completed > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <p className="text-sm font-bold text-slate-600 mb-4">הביצועים שלי</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-extrabold text-brand-700">{progress.attempts_completed}</p>
                <p className="text-xs text-slate-400">מבחנים הושלמו</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-green-600">
                  {progress.best_score !== null ? `${progress.best_score}%` : "—"}
                </p>
                <p className="text-xs text-slate-400">ציון מקסימלי</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-600">
                  {progress.avg_score !== null ? `${progress.avg_score}%` : "—"}
                </p>
                <p className="text-xs text-slate-400">ממוצע</p>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {!loading && history.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <p className="text-sm font-bold text-slate-600 mb-4">מבחנים אחרונים</p>
            <div className="space-y-2">
              {history.map((h) => {
                const date = h.completed_at
                  ? new Date(h.completed_at).toLocaleDateString("he-IL")
                  : "—";
                const passed =
                  h.score_percentage !== undefined &&
                  h.score_percentage !== null &&
                  h.score_percentage >= test.passing_threshold_percentage;
                return (
                  <Link
                    key={h.id}
                    href={`/math-app/bar-ilan/results/${h.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {passed ? "✓" : "✗"}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {h.is_simulation ? "סימולציה" : "תרגול מלא"}
                        </p>
                        <p className="text-xs text-slate-400">{date}</p>
                      </div>
                    </div>
                    <span className={`text-lg font-extrabold ${passed ? "text-green-600" : "text-red-500"}`}>
                      {h.score_percentage !== null && h.score_percentage !== undefined
                        ? `${h.score_percentage}%`
                        : "—"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
