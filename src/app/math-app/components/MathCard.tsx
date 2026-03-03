"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { MathQuestion } from "../lib/types";
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from "../lib/types";
import type { SessionStats } from "../hooks/useAdaptiveEngine";
import Keypad from "./Keypad";

interface MathCardProps {
  question: MathQuestion;
  stats: SessionStats;
  onSubmit: (value: string) => boolean;
  onNext: () => void;
}

export default function MathCard({ question, stats, onSubmit, onNext }: MathCardProps) {
  const [input, setInput]       = useState("");
  const [shake, setShake]       = useState(false);
  const [pulse, setPulse]       = useState(false);
  const [answered, setAnswered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset on new question
  useEffect(() => {
    setInput("");
    setShake(false);
    setPulse(false);
    setAnswered(false);
    cardRef.current?.focus();
  }, [question.id]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || answered || stats.showHint) return;
    const isCorrect = onSubmit(input);
    setAnswered(true);
    if (isCorrect) {
      setPulse(true);
      setTimeout(() => setPulse(false), 700);
    } else {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        // allow re-try unless the engine's own hint was triggered
        if (!stats.showHint) setAnswered(false);
      }, 600);
    }
  }, [input, answered, stats.showHint, onSubmit]);

  // Physical keyboard support (for desktop users)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (stats.showHint) return;
    const { key } = e;
    if (key === "Enter") { e.preventDefault(); handleSubmit(); return; }
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      setInput(prev => prev.length < 7 ? prev + key : prev);
    } else if (key === "." || key === ",") {
      e.preventDefault();
      setInput(prev => !prev.includes(".") && prev.length < 7 ? prev + "." : prev);
    } else if (key === "Backspace") {
      e.preventDefault();
      setInput(prev => prev.slice(0, -1));
    }
  }, [stats.showHint, handleSubmit]);

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex flex-col gap-4 w-full max-w-lg mx-auto focus:outline-none"
    >
      {/* ── level badge + session stats ── */}
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

      {/* ── streak ── */}
      {stats.streak > 0 && (
        <div className="text-center text-sm text-green-600 font-medium animate-bounce">
          🔥 רצף של {stats.streak} תשובות נכונות!
        </div>
      )}

      {/* ── question card ── */}
      <div className={[
        "rounded-2xl border bg-white shadow-sm px-6 pt-8 pb-6 text-center transition-all duration-150",
        pulse ? "bg-green-50 border-green-300 scale-[1.01]" : "border-slate-200",
        shake ? "animate-shake" : "",
      ].join(" ")}>

        {/* question text */}
        <p className="text-2xl font-bold text-slate-800 leading-relaxed mb-6">
          {question.text}
        </p>

        {/* value display (replaces <input>) */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={[
            "w-36 h-14 flex items-center justify-center rounded-xl border-2 text-xl font-bold transition-all",
            stats.showHint
              ? "border-slate-200 bg-slate-100 text-slate-400"
              : input
                ? "border-brand-400 bg-brand-50 text-slate-800"
                : "border-slate-300 bg-white text-slate-400",
          ].join(" ")}>
            {input || <span className="text-base font-normal text-slate-400">הכנס…</span>}
          </div>
          {question.unit && (
            <span className="text-xl font-bold text-slate-600">{question.unit}</span>
          )}
        </div>

        {/* Keypad — always rendered inside card when not in hint mode */}
        {!stats.showHint && (
          <Keypad
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={answered && !stats.lastAnswerCorrect}
          />
        )}
      </div>

      {/* ── full-solution panel (replaces simple hint) ── */}
      {stats.showHint && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-6 flex flex-col gap-3 animate-fadein">
          <p className="text-base font-bold text-amber-700 text-center">💡 פתרון מלא</p>

          {/* step-by-step */}
          <ol className="flex flex-col gap-2 text-right">
            {question.fullSolution.map((step, i) => (
              <li
                key={i}
                className={[
                  "text-sm leading-relaxed px-3 py-2 rounded-lg",
                  step.startsWith("✅")
                    ? "bg-green-100 text-green-800 font-bold"
                    : "bg-white text-amber-900 border border-amber-200",
                ].join(" ")}
              >
                {step}
              </li>
            ))}
          </ol>

          <p className="text-xs text-amber-600 text-center">הרמה ירדה — ננסה שוב!</p>
          <button
            onClick={onNext}
            className="mx-auto px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 active:scale-95 transition-all"
          >
            שאלה הבאה ←
          </button>
        </div>
      )}

      {/* ── inline feedback ── */}
      {stats.lastAnswerCorrect === true && !stats.showHint && (
        <div className="text-center text-green-600 font-bold text-lg animate-fadein">
          ✅ כל הכבוד!{stats.streak >= 3 ? " 🎉 עלית רמה!" : ""}
        </div>
      )}
      {stats.lastAnswerCorrect === false && !stats.showHint && !answered && (
        <div className="text-center text-red-500 font-medium animate-fadein">
          ❌ לא מדויק — נסה שוב
        </div>
      )}
    </div>
  );
}
