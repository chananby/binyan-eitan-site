"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { PercentQuestion } from "../lib/engines/percentages";
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from "../lib/engines/percentages";
import type { SessionStats } from "../hooks/useAdaptiveEngine";

interface MathCardProps {
  question: PercentQuestion;
  stats: SessionStats;
  onSubmit: (value: string) => boolean;
  onNext: () => void;
}

export default function MathCard({ question, stats, onSubmit, onNext }: MathCardProps) {
  const [input, setInput]       = useState("");
  const [shake, setShake]       = useState(false);
  const [pulse, setPulse]       = useState(false);
  const [answered, setAnswered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset card on each new question
  useEffect(() => {
    setInput("");
    setShake(false);
    setPulse(false);
    setAnswered(false);
    inputRef.current?.focus();
  }, [question.id]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || answered) return;
    const isCorrect = onSubmit(input);
    setAnswered(true);
    if (isCorrect) {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } else {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setAnswered(false); // allow re-try on wrong (unless hint forced)
      }, 600);
    }
  }, [input, answered, onSubmit]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSubmit(); },
    [handleSubmit]
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">

      {/* level badge + session stats */}
      <div className="flex items-center justify-between gap-4">
        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${DIFFICULTY_COLORS[stats.level]}`}>
          רמה {stats.level} — {DIFFICULTY_LABELS[stats.level]}
        </span>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>✅ {stats.correct}</span>
          <span>❌ {stats.wrong}</span>
          <span className="text-amber-600 font-bold">⭐ {stats.points} נק׳</span>
        </div>
      </div>

      {/* streak indicator */}
      {stats.streak > 0 && (
        <div className="text-center text-sm text-green-600 font-medium animate-bounce">
          🔥 רצף של {stats.streak} תשובות נכונות!
        </div>
      )}

      {/* question card */}
      <div className={[
        "rounded-2xl border bg-white shadow-sm p-8 text-center transition-all duration-150",
        pulse ? "bg-green-50 border-green-300 scale-[1.01]" : "border-slate-200",
        shake ? "animate-shake" : "",
      ].join(" ")}>
        <p className="text-2xl font-bold text-slate-800 leading-relaxed mb-6">
          {question.text}
        </p>

        <div className="flex items-center justify-center gap-2">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="הכנס תשובה..."
            disabled={stats.showHint}
            className={[
              "w-36 text-center text-xl font-bold rounded-xl border-2 px-4 py-3",
              "focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all",
              stats.showHint
                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                : "border-slate-300 bg-white",
            ].join(" ")}
          />
          {question.unit && (
            <span className="text-xl font-bold text-slate-600">{question.unit}</span>
          )}
        </div>

        {!stats.showHint && (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className={[
              "mt-5 px-8 py-3 rounded-xl font-bold text-lg transition-all duration-150",
              input.trim()
                ? "bg-brand-600 text-white hover:bg-brand-700 active:scale-95 shadow-md"
                : "bg-slate-200 text-slate-400 cursor-not-allowed",
            ].join(" ")}
          >
            בדוק
          </button>
        )}
      </div>

      {/* hint box */}
      {stats.showHint && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-6 flex flex-col gap-4 text-center animate-fadein">
          <p className="text-lg font-bold text-amber-700">💡 רמז</p>
          <p className="text-base text-amber-800 leading-relaxed">{question.hint}</p>
          <p className="text-sm text-amber-600">הרמה ירדה — ננסה שוב מהתחלה!</p>
          <button
            onClick={onNext}
            className="mx-auto px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 active:scale-95 transition-all"
          >
            שאלה הבאה ←
          </button>
        </div>
      )}

      {/* correct feedback */}
      {stats.lastAnswerCorrect === true && !stats.showHint && (
        <div className="text-center text-green-600 font-bold text-lg animate-fadein">
          ✅ כל הכבוד! {stats.streak >= 3 ? "🎉 עלית רמה!" : ""}
        </div>
      )}

      {/* wrong feedback (before hint threshold) */}
      {stats.lastAnswerCorrect === false && !stats.showHint && !answered && (
        <div className="text-center text-red-500 font-medium animate-fadein">
          ❌ לא מדויק — נסה שוב
        </div>
      )}
    </div>
  );
}
