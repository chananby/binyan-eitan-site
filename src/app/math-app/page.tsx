"use client";

import { useState } from "react";
import Link from "next/link";
import MathCard from "./components/MathCard";
import { useAdaptiveEngine } from "./hooks/useAdaptiveEngine";
import type { Difficulty } from "./lib/engines/percentages";

// ── Topic registry ────────────────────────────────────────────────────────────

interface Topic {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  available: boolean;
}

const TOPICS: Topic[] = [
  { id: "percentages", emoji: "💯", title: "אחוזים",    subtitle: "מציאה, הפוך, ושיעור אחוזים", available: true },
  { id: "fractions",   emoji: "🍕", title: "שברים",     subtitle: "חיבור, חיסור, כפל וחילוק",  available: false },
  { id: "geometry",    emoji: "📐", title: "גיאומטריה", subtitle: "שטח, היקף ונפח",            available: false },
  { id: "algebra",     emoji: "🔢", title: "אלגברה",    subtitle: "משוואות ופונקציות",         available: false },
];

// ── Active session ────────────────────────────────────────────────────────────

function PercentagesSession({ onBack }: { onBack: () => void }) {
  const { question, stats, submit, next, reset } = useAdaptiveEngine(1 as Difficulty);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium"
        >
          → חזרה לנושאים
        </button>
        <button
          onClick={reset}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
        >
          התחל מחדש
        </button>
      </div>

      <MathCard question={question} stats={stats} onSubmit={submit} onNext={next} />

      <div className="rounded-xl bg-white border border-slate-200 p-4 text-center text-sm text-slate-500 shadow-sm">
        <span className="font-semibold text-slate-700">סיכום סשן: </span>
        {stats.correct} נכון · {stats.wrong} טעות ·{" "}
        <span className="text-amber-600 font-bold">{stats.points} נק׳</span>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function MathAppDashboard() {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  if (activeTopic === "percentages") {
    return (
      <Shell>
        <PercentagesSession onBack={() => setActiveTopic(null)} />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold mb-4">
          🎓 תוכנית המחוננים — אוניברסיטת בר-אילן
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">
          בחר נושא לתרגול
        </h1>
        <p className="text-slate-500 text-base">
          האפליקציה מתאימה את הרמה אוטומטית לפי ההתקדמות שלך
        </p>
      </div>

      {/* topic grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            disabled={!topic.available}
            onClick={() => topic.available && setActiveTopic(topic.id)}
            className={[
              "rounded-2xl border p-6 text-right transition-all duration-150 flex items-start gap-4 shadow-sm",
              topic.available
                ? "bg-white border-slate-200 hover:border-brand-400 hover:shadow-md hover:scale-[1.02] cursor-pointer"
                : "bg-slate-50 border-slate-100 cursor-not-allowed opacity-60",
            ].join(" ")}
          >
            <span className="text-3xl flex-shrink-0">{topic.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-bold text-slate-800">{topic.title}</p>
                {!topic.available && (
                  <span className="text-xs font-semibold bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                    בקרוב
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{topic.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="text-center">
        <Link
          href="/math-app/parent"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-brand-600 transition-colors underline underline-offset-2"
        >
          📊 לוח הורה / מורה ←
        </Link>
      </div>
    </Shell>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-2xl">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧮</span>
            <div>
              <p className="font-extrabold text-slate-800 text-lg leading-tight">מתמטיקה</p>
              <p className="text-xs text-slate-400">כיתות ה׳–ו׳</p>
            </div>
          </div>
          <Link
            href="/math-app/parent"
            className="text-xs text-slate-400 hover:text-brand-600 transition-colors"
          >
            הורה / מורה
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
