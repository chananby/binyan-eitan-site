"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSyncKey } from "@/src/lib/math-tests/attempts";
import { getPracticeModule, getModuleProgress } from "@/src/lib/math-tests/practice";
import { BidiText } from "@/src/lib/math-tests/bidi";
import type { PracticeProgress } from "@/src/types/math-test";

export default function AlgebraAbSummary() {
  const mod = getPracticeModule();
  const [progress, setProgress] = useState<PracticeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = getSyncKey();
    getModuleProgress(key, mod.slug).then(({ rows }) => {
      setProgress(rows);
      setLoading(false);
    });
  }, [mod.slug]);

  function getProgForLevel(levelId: string): PracticeProgress | null {
    return progress.find((p) => p.level_id === levelId) ?? null;
  }

  const totalCorrect = progress.reduce((sum, p) => sum + p.questions_correct, 0);
  const totalAnswered = progress.reduce((sum, p) => sum + p.questions_answered, 0);
  const overallPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 py-10 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">

        <Link
          href="/math-app/bar-ilan/practice/algebra-ab"
          className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 font-medium py-2.5"
        >
          ← חזרה לתפריט
        </Link>

        {/* Overall */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7 text-center">
          <p className="text-xs font-semibold text-brand-500 mb-1">סיכום כולל</p>
          <h1 className="text-lg font-extrabold text-slate-800 mb-4">
            <BidiText text={mod.name_he} />
          </h1>
          {loading ? (
            <p className="text-slate-400 text-sm">טוען...</p>
          ) : (
            <>
              <p className="text-5xl font-extrabold text-brand-600 my-3">{overallPct}%</p>
              <p className="text-sm text-slate-500">{totalCorrect} נכון מתוך {totalAnswered} שאלות שנענו</p>
            </>
          )}
        </div>

        {/* Per-level breakdown */}
        <div className="space-y-3">
          {mod.levels.map((lvl) => {
            const prog = getProgForLevel(lvl.id);
            const correct = prog?.questions_correct ?? 0;
            const total = lvl.questions.length;
            const pct = prog ? Math.round((correct / total) * 100) : null;
            const done = prog?.status === "completed";

            return (
              <div key={lvl.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-slate-800 text-sm">
                    <BidiText text={lvl.name_he} />
                  </p>
                  {pct !== null && (
                    <span className={`text-lg font-extrabold ${pct >= 75 ? "text-green-600" : "text-amber-600"}`}>
                      {pct}%
                    </span>
                  )}
                </div>

                {prog && (
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all ${pct !== null && pct >= 75 ? "bg-green-500" : "bg-amber-400"}`}
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {prog ? `${correct}/${total} נכון` : "טרם הושלם"}
                  </p>
                  <Link
                    href={`/math-app/bar-ilan/practice/algebra-ab/level/${lvl.id}`}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-800"
                  >
                    {done ? "תרגל מחדש" : "המשך"} ←
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href="/math-app/bar-ilan"
          className="block text-center bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          חזור לסימולציה ←
        </Link>
      </div>
    </div>
  );
}
