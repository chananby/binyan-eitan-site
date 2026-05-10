"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSyncKey } from "@/src/lib/math-tests/attempts";
import { getPracticeModule, getModuleProgress } from "@/src/lib/math-tests/practice";
import type { PracticeProgress } from "@/src/types/math-test";

export default function AlgebraAbLanding() {
  const mod = getPracticeModule();
  const [progress, setProgress] = useState<PracticeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = getSyncKey();
    getModuleProgress(key, mod.slug).then((rows) => {
      setProgress(rows);
      setLoading(false);
    });
  }, [mod.slug]);

  function getProgForLevel(levelId: string): PracticeProgress | null {
    return progress.find((p) => p.level_id === levelId) ?? null;
  }

  const allCompleted =
    !loading &&
    mod.levels.every((lvl) => getProgForLevel(lvl.id)?.status === "completed");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 py-10 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">

        <Link
          href="/math-app/bar-ilan"
          className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 font-medium"
        >
          ← חזרה
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
          <p className="text-xs font-semibold text-amber-600 mb-1">תרגול ממוקד</p>
          <h1 className="text-xl font-extrabold text-slate-800 mb-2">{mod.name_he}</h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">{mod.description_he}</p>

          <Link
            href="/math-app/bar-ilan/practice/algebra-ab/intro"
            className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 font-semibold"
          >
            📖 קרא/י מבוא לביטויים אלגבריים
          </Link>
        </div>

        {/* Level cards */}
        <div className="space-y-3">
          {mod.levels.map((lvl) => {
            const prog = getProgForLevel(lvl.id);
            const done = prog?.status === "completed";
            const inProg = prog?.status === "in_progress";
            const correct = prog?.questions_correct ?? 0;
            const total = lvl.questions.length;
            const answered = prog?.questions_answered ?? 0;

            return (
              <Link
                key={lvl.id}
                href={`/math-app/bar-ilan/practice/algebra-ab/level/${lvl.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:border-brand-200 hover:shadow-md transition-all"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 font-bold ${
                  done
                    ? "bg-green-100 text-green-600"
                    : inProg
                    ? "bg-amber-100 text-amber-600"
                    : "bg-slate-100 text-slate-400"
                }`}>
                  {done ? "✓" : inProg ? "⟳" : lvl.level_number}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{lvl.name_he}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{lvl.description_he}</p>
                  {!loading && prog && (
                    <p className="text-xs text-slate-400 mt-1">
                      {done ? `${correct}/${total} נכון` : `ענית על ${answered} מתוך ${total}`}
                    </p>
                  )}
                </div>

                <span className="text-slate-300 text-lg shrink-0">←</span>
              </Link>
            );
          })}
        </div>

        {/* Summary CTA */}
        {allCompleted && (
          <Link
            href="/math-app/bar-ilan/practice/algebra-ab/summary"
            className="block text-center bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            צפה בסיכום כולל ←
          </Link>
        )}
      </div>
    </div>
  );
}
