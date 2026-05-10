"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import TimerBar from "../components/TimerBar";
import { generateQuestion as genPct  } from "../lib/engines/percentages";
import { generateQuestion as genFrac } from "../lib/engines/fractions";
import { generateQuestion as genG3   } from "../lib/engines/grade3";
import { generateQuestion as genDiv  } from "../lib/engines/grade3-division";
import { generateQuestion as genG4   } from "../lib/engines/grade4";
import { generateQuestion as genWP   } from "../lib/engines/word-problems";
import type { MathQuestion } from "../lib/types";

const DAILY_KEY  = "bm_daily";
const TIMER_SECS = 35;
const TOTAL      = 10;

interface DailyRecord { date: string; score: number; }

const todayStr = () => new Date().toISOString().slice(0, 10);

function loadRecord(): DailyRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as DailyRecord;
    return r.date === todayStr() ? r : null;
  } catch { return null; }
}

function saveRecord(score: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_KEY, JSON.stringify({ date: todayStr(), score }));
}

function buildQuestions(): MathQuestion[] {
  return [
    genG3(1),  genG3(2),
    genDiv(1), genG4(2),
    genWP(1),  genWP(2),
    genWP(3),  genPct(1),
    genFrac(1),genFrac(2),
  ];
}

function scoreEmoji(s: number) {
  if (s >= 9) return "🏆";
  if (s >= 7) return "⭐";
  if (s >= 5) return "💪";
  return "📚";
}

export default function DailyChallengePage() {
  const [record,   setRecord]   = useState<DailyRecord | null>(null);
  const [ready,    setReady]    = useState(false);
  const [qs]                    = useState<MathQuestion[]>(buildQuestions);
  const [idx,      setIdx]      = useState(0);
  const [value,    setValue]    = useState("");
  const [score,    setScore]    = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [done,     setDone]     = useState(false);

  const scoreRef    = useRef(score);
  const feedbackRef = useRef(feedback);
  useEffect(() => { scoreRef.current    = score;    }, [score]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);

  // Load today's record on mount
  useEffect(() => { setRecord(loadRecord()); setReady(true); }, []);

  // Timer
  useEffect(() => {
    if (!ready || done || !!feedback || !!record) return;
    if (timeLeft <= 0) { advance(false); return; }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, ready, done, feedback, record]);

  // Reset timer & input on new question
  useEffect(() => { setTimeLeft(TIMER_SECS); setValue(""); }, [idx]);

  function advance(correct: boolean) {
    const newScore = scoreRef.current + (correct ? 1 : 0);
    if (correct) setScore(newScore);
    setFeedback(correct ? "correct" : "wrong");
    setTimeout(() => {
      setFeedback(null);
      if (idx + 1 >= TOTAL) { saveRecord(newScore); setDone(true); }
      else setIdx(i => i + 1);
    }, 900);
  }

  function submit() {
    if (feedback) return;
    const parsed = parseFloat(value.replace(",", "."));
    if (isNaN(parsed)) return;
    const q = qs[idx];
    advance(Math.abs(parsed - q.answer) < 0.001);
  }

  // Already played today
  if (ready && record) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 flex flex-col items-center justify-center px-4 py-10" dir="rtl">
        <div className="w-full max-w-sm text-center bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
          <div className="text-6xl mb-4">{scoreEmoji(record.score)}</div>
          <p className="text-xs font-bold tracking-widest text-brand-600 uppercase mb-2">אתגר יומי</p>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">כבר שיחקת היום!</h2>
          <p className="text-5xl font-black text-brand-600 my-5">{record.score}<span className="text-2xl text-slate-400">/{TOTAL}</span></p>
          <p className="text-slate-400 text-sm mb-8">חזור מחר לאתגר חדש 🌅</p>
          <Link href="/math-app" className="inline-block text-sm text-brand-600 hover:underline font-semibold py-2.5 px-1">← חזרה לדף הבית</Link>
        </div>
      </div>
    );
  }

  if (done) {
    const emoji = scoreEmoji(score);
    const pct   = Math.round((score / TOTAL) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 flex flex-col items-center justify-center px-4 py-10" dir="rtl">
        <div className="w-full max-w-sm text-center bg-white rounded-3xl shadow-sm border border-slate-200 p-10">
          <div className="text-6xl mb-4">{emoji}</div>
          <p className="text-xs font-bold tracking-widest text-brand-600 uppercase mb-2">אתגר יומי</p>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">סיימת!</h2>
          <p className="text-5xl font-black text-brand-600 my-5">{score}<span className="text-2xl text-slate-400">/{TOTAL}</span></p>
          <p className="text-sm text-slate-500 mb-8">{pct}% נכון · {score >= 8 ? "מדהים! 🎉" : score >= 5 ? "כל הכבוד! 💪" : "אפשר יותר 📚"}</p>
          <Link href="/math-app" className="inline-block text-sm text-brand-600 hover:underline font-semibold py-2.5 px-1">← חזרה לדף הבית</Link>
        </div>
      </div>
    );
  }

  if (!ready) return null;

  const q = qs[idx];
  const isSpace = false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 flex flex-col items-center justify-start px-4 py-10" dir="rtl">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-extrabold text-slate-800 text-lg leading-tight">אתגר יומי</p>
              <p className="text-xs text-slate-400">שאלה {idx + 1} מתוך {TOTAL}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-amber-500">{score}</p>
            <p className="text-xs text-slate-400">נכון</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1 mb-5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < idx ? "bg-brand-400" : i === idx ? "bg-brand-600" : "bg-slate-200"
            }`} />
          ))}
        </div>

        {/* Timer */}
        <div className="mb-4">
          <TimerBar timeLeft={timeLeft} total={TIMER_SECS} />
        </div>

        {/* Question card */}
        <div className={`rounded-2xl border-2 p-6 mb-4 transition-all duration-200 ${
          feedback === "correct" ? "bg-green-50 border-green-300" :
          feedback === "wrong"   ? "bg-red-50   border-red-300"   :
          "bg-white border-slate-200"
        }`}>
          <p className="text-xl font-bold text-slate-800 leading-relaxed mb-6">{q.text}</p>

          {feedback ? (
            <div className={`text-center py-4 text-2xl font-extrabold ${
              feedback === "correct" ? "text-green-600" : "text-red-500"
            }`}>
              {feedback === "correct"
                ? "✓ נכון!"
                : `✗ התשובה: ${q.answer}${q.unit ? ` ${q.unit}` : ""}`}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                autoFocus
                type="number"
                inputMode="numeric"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                placeholder="תשובה..."
                className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:border-brand-400 transition-colors"
                dir="ltr"
              />
              <button
                onClick={submit}
                disabled={!value.trim()}
                className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold text-lg disabled:opacity-30 hover:bg-brand-700 active:scale-95 transition-all"
              >
                ✓
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">💡 {q.hint}</p>
      </div>
    </div>
  );
}
