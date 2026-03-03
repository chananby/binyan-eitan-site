"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StoredStats } from "../hooks/useAdaptiveEngine";
import { DIFFICULTY_LABELS } from "../lib/engines/percentages";
import type { Difficulty } from "../lib/engines/percentages";

const STORAGE_KEY = "barilan_math_stats";

const EMPTY: StoredStats = {
  totalCorrect: 0, totalWrong: 0,
  highestLevel: 1, sessionsPlayed: 0,
  pointsTotal: 0, lastPlayed: "",
};

function loadStats(): StoredStats {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ emoji, label, value, sub, accent }: {
  emoji: string; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex flex-col gap-1">
      <p className="text-2xl">{emoji}</p>
      <p className={`text-2xl font-extrabold ${accent ?? "text-slate-800"}`}>{value}</p>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Accuracy bar ──────────────────────────────────────────────────────────────

function AccuracyBar({ correct, wrong }: { correct: number; wrong: number }) {
  const total = correct + wrong;
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-600">דיוק כללי</p>
        <p className="text-lg font-extrabold text-slate-800">{pct}%</p>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-400">
        <span>✅ {correct} נכון</span>
        <span>❌ {wrong} טעות</span>
      </div>
    </div>
  );
}

// ── Coaching tip ──────────────────────────────────────────────────────────────

function ProgressTip({ stats }: { stats: StoredStats }) {
  const total = stats.totalCorrect + stats.totalWrong;
  if (total === 0) {
    return (
      <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4 border border-slate-200">
        👋 לא נמצאו נתונים עדיין. המתמטיקאי הצעיר טרם התחיל לתרגל.
      </p>
    );
  }
  const acc = stats.totalCorrect / total;
  let msg = "";
  if (acc >= 0.85 && stats.highestLevel === 3) {
    msg = "🏆 מצוין! הרמה הגבוהה ביותר הושגה עם דיוק גבוה. שקול להוסיף נושאים חדשים.";
  } else if (acc >= 0.7) {
    msg = "📈 התקדמות יפה! ממשיך לשפר. שמור על הרצף!";
  } else if (acc < 0.5 && total >= 10) {
    msg = "💡 יש מקום לשיפור. מומלץ לתרגל שוב את רמה 1 לפני שממשיכים.";
  } else {
    msg = "✏️ כל שאלה היא צעד קדימה. המשך לתרגל!";
  }
  return (
    <p className="text-sm text-slate-700 bg-brand-50 rounded-xl p-4 border border-brand-200 leading-relaxed">
      {msg}
    </p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const [stats, setStats]   = useState<StoredStats>(EMPTY);
  const [cleared, setCleared] = useState(false);

  useEffect(() => { setStats(loadStats()); }, []);

  const handleClear = () => {
    if (!confirm("האם למחוק את כל נתוני ההתקדמות? פעולה זו אינה הפיכה.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setStats({ ...EMPTY });
    setCleared(true);
  };

  const total = stats.totalCorrect + stats.totalWrong;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">

        {/* header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">📊 לוח הורה / מורה</h1>
            <p className="text-sm text-slate-400 mt-0.5">סטטיסטיקות מצטברות מכל הסשנים</p>
          </div>
          <Link href="/math-app" className="text-sm text-brand-600 hover:underline font-medium">
            ← לתרגול
          </Link>
        </div>

        <p className="text-xs text-slate-400 mb-6 text-left">
          תרגול אחרון: {formatDate(stats.lastPlayed)}
        </p>

        {/* stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard emoji="⭐" label="נקודות"       value={stats.pointsTotal}   accent="text-amber-500" />
          <StatCard emoji="✅" label="תשובות נכונות" value={stats.totalCorrect}  accent="text-green-600" />
          <StatCard emoji="🎯" label="רמה הגבוהה"   value={DIFFICULTY_LABELS[stats.highestLevel as Difficulty]}
                               sub={`רמה ${stats.highestLevel}`} accent="text-brand-600" />
          <StatCard emoji="🔁" label="סשנים"        value={stats.sessionsPlayed}
                               sub={total > 0 ? `${total} שאלות` : ""} />
        </div>

        {/* accuracy bar */}
        <div className="mb-5">
          <AccuracyBar correct={stats.totalCorrect} wrong={stats.totalWrong} />
        </div>

        {/* coaching tip */}
        <div className="mb-8">
          <ProgressTip stats={stats} />
        </div>

        {/* level grid */}
        {total > 0 && (
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm mb-8">
            <p className="text-sm font-semibold text-slate-600 mb-3">רמות שהושגו</p>
            <div className="flex gap-3">
              {([1, 2, 3] as Difficulty[]).map((lvl) => (
                <div key={lvl} className={[
                  "flex-1 rounded-xl p-3 text-center border",
                  lvl <= stats.highestLevel
                    ? "bg-brand-50 border-brand-200 text-brand-700"
                    : "bg-slate-50 border-slate-100 text-slate-300",
                ].join(" ")}>
                  <p className="text-lg font-extrabold">{lvl}</p>
                  <p className="text-xs font-medium">{DIFFICULTY_LABELS[lvl]}</p>
                  {lvl <= stats.highestLevel && <p className="text-base mt-1">✔</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* danger zone */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleClear}
            className="text-sm text-red-400 hover:text-red-600 transition-colors underline underline-offset-2"
          >
            מחק נתוני התקדמות
          </button>
          {cleared && <span className="text-sm text-green-600 animate-fadein">הנתונים נמחקו.</span>}
        </div>

      </div>
    </div>
  );
}
