"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import MathCard from "./components/MathCard";
import TimerBar from "./components/TimerBar";
import { useAdaptiveEngine } from "./hooks/useAdaptiveEngine";
import { generateQuestion as generatePct } from "./lib/engines/percentages";
import { generateQuestion as generateFrac } from "./lib/engines/fractions";
import type { Difficulty, MathQuestion } from "./lib/types";

// ── Topic registry ────────────────────────────────────────────────────────────

interface Topic {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  generateFn: (d: Difficulty) => MathQuestion;
}

const TOPICS: Topic[] = [
  {
    id: "percentages",
    emoji: "💯",
    title: "אחוזים",
    subtitle: "מציאה, הפוך, ושיעור אחוזים",
    generateFn: generatePct,
  },
  {
    id: "fractions",
    emoji: "🍕",
    title: "שברים",
    subtitle: "שברי יחידה, שברים פשוטים ומספרים מעורבים",
    generateFn: generateFrac,
  },
];

const COMING_SOON = [
  { id: "geometry", emoji: "📐", title: "גיאומטריה", subtitle: "שטח, היקף ונפח" },
  { id: "algebra",  emoji: "🔢", title: "אלגברה",    subtitle: "משוואות ופונקציות" },
];

// ── Generic Session ───────────────────────────────────────────────────────────

const TIMER_SECS = 45;

interface SessionProps {
  topic: Topic;
  onBack: () => void;
}

function Session({ topic, onBack }: SessionProps) {
  const engine       = useAdaptiveEngine(topic.generateFn, 1);
  const [timerMode, setTimerMode] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(TIMER_SECS);

  // Keep a stable ref to engine.timeout so the interval closure never goes stale
  const timeoutRef = useRef(engine.timeout);
  useEffect(() => { timeoutRef.current = engine.timeout; }, [engine.timeout]);

  // Reset timer whenever the question changes (or timer mode toggles)
  useEffect(() => {
    setTimeLeft(TIMER_SECS);
  }, [engine.question.id, timerMode]);

  // Timer tick — pause when hint is visible
  useEffect(() => {
    if (!timerMode || engine.stats.showHint) return;

    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          timeoutRef.current();
          return TIMER_SECS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [timerMode, engine.stats.showHint, engine.question.id]);

  return (
    <div className="flex flex-col gap-6">

      {/* ── nav row ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium"
        >
          → חזרה לנושאים
        </button>

        <div className="flex items-center gap-3">
          {/* Marathon toggle */}
          <button
            onClick={() => setTimerMode(m => !m)}
            className={[
              "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all",
              timerMode
                ? "bg-red-100 border-red-300 text-red-700"
                : "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200",
            ].join(" ")}
          >
            ⏱ {timerMode ? "מרתון: פועל" : "מרתון: כבוי"}
          </button>

          <button
            onClick={engine.reset}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
          >
            אפס
          </button>
        </div>
      </div>

      {/* ── timer bar ── */}
      {timerMode && !engine.stats.showHint && (
        <TimerBar timeLeft={timeLeft} total={TIMER_SECS} />
      )}

      {/* ── question card + keypad ── */}
      <MathCard
        question={engine.question}
        stats={engine.stats}
        onSubmit={engine.submit}
        onNext={engine.next}
      />

      {/* ── session summary strip ── */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 text-center text-sm text-slate-500 shadow-sm">
        <span className="font-semibold text-slate-700">סיכום סשן: </span>
        {engine.stats.correct} נכון · {engine.stats.wrong} טעות ·{" "}
        <span className="text-amber-600 font-bold">{engine.stats.points} נק׳</span>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function MathAppDashboard() {
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);

  if (activeTopic) {
    return (
      <Shell>
        <Session topic={activeTopic} onBack={() => setActiveTopic(null)} />
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
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">בחר נושא לתרגול</h1>
        <p className="text-slate-500 text-base">
          האפליקציה מתאימה את הרמה אוטומטית לפי ההתקדמות שלך
        </p>
      </div>

      {/* available topics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            onClick={() => setActiveTopic(topic)}
            className="rounded-2xl border p-6 text-right transition-all duration-150 flex items-start gap-4 shadow-sm
              bg-white border-slate-200 hover:border-brand-400 hover:shadow-md hover:scale-[1.02] cursor-pointer"
          >
            <span className="text-3xl flex-shrink-0">{topic.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-slate-800">{topic.title}</p>
              <p className="text-sm text-slate-500 mt-0.5">{topic.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      {/* coming soon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 opacity-60">
        {COMING_SOON.map((topic) => (
          <div
            key={topic.id}
            className="rounded-2xl border p-6 text-right flex items-start gap-4 shadow-sm
              bg-slate-50 border-slate-100 cursor-not-allowed"
          >
            <span className="text-3xl flex-shrink-0">{topic.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-bold text-slate-700">{topic.title}</p>
                <span className="text-xs font-semibold bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                  בקרוב
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">{topic.subtitle}</p>
            </div>
          </div>
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
          <Link href="/math-app/parent" className="text-xs text-slate-400 hover:text-brand-600 transition-colors">
            הורה / מורה
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
