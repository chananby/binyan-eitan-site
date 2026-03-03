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
  spaceMode?: boolean;
}

export default function MathCard({
  question,
  stats,
  onSubmit,
  onNext,
  spaceMode = false,
}: MathCardProps) {
  const [input, setInput]       = useState("");
  const [shake, setShake]       = useState(false);
  const [pulse, setPulse]       = useState(false);
  const [answered, setAnswered] = useState(false);
  const cardRef     = useRef<HTMLDivElement>(null);
  // Ref tracks showHint so the setTimeout callback never reads a stale closure value
  const showHintRef = useRef(stats.showHint);
  useEffect(() => { showHintRef.current = stats.showHint; }, [stats.showHint]);

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
        if (!showHintRef.current) setAnswered(false);
      }, 600);
    }
  }, [input, answered, onSubmit]);

  // Physical keyboard support
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

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const cardBase = spaceMode
    ? "bg-[#0d1b4e] border-cyan-500/30 shadow-cyan-500/10"
    : "bg-white border-slate-200 shadow-sm";

  const cardPulse = spaceMode
    ? "bg-cyan-500/10 border-cyan-400 scale-[1.01]"
    : "bg-green-50 border-green-300 scale-[1.01]";

  const questionText = spaceMode ? "text-cyan-100" : "text-slate-800";

  const inputBase = spaceMode
    ? "border-slate-600 bg-[#050d1f] text-slate-500"
    : "border-slate-300 bg-white text-slate-400";

  const inputFilled = spaceMode
    ? "border-cyan-400 bg-cyan-500/10 text-cyan-300"
    : "border-brand-400 bg-brand-50 text-slate-800";

  const inputHint = spaceMode
    ? "border-slate-700 bg-[#050d1f] text-slate-600"
    : "border-slate-200 bg-slate-100 text-slate-400";

  const inputPlaceholder = spaceMode ? "text-slate-600" : "text-slate-400";
  const unitText = spaceMode ? "text-cyan-400" : "text-slate-600";

  const streakText = spaceMode ? "text-cyan-400" : "text-green-600";

  const hintPanel = spaceMode
    ? "bg-indigo-950/80 border-indigo-400/50"
    : "bg-amber-50 border-amber-300";
  const hintTitle = spaceMode ? "text-indigo-300" : "text-amber-700";
  const hintStepDefault = spaceMode
    ? "bg-[#0d1b4e] text-indigo-200 border border-indigo-500/30"
    : "bg-white text-amber-900 border border-amber-200";
  const hintStepCorrect = spaceMode
    ? "bg-cyan-500/20 text-cyan-300 font-bold"
    : "bg-green-100 text-green-800 font-bold";
  const hintSub = spaceMode ? "text-indigo-400" : "text-amber-600";
  const hintBtn = spaceMode
    ? "bg-cyan-500 text-[#050d1f] hover:bg-cyan-400"
    : "bg-amber-500 text-white hover:bg-amber-600";

  const feedbackCorrect = spaceMode ? "text-cyan-400" : "text-green-600";
  const feedbackWrong   = spaceMode ? "text-red-400"  : "text-red-500";

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
        <div className={`flex items-center gap-4 text-sm ${spaceMode ? "text-cyan-500/70" : "text-slate-500"}`}>
          <span>✅ {stats.correct}</span>
          <span>❌ {stats.wrong}</span>
          <span className="text-amber-400 font-bold">⭐ {stats.points} נק׳</span>
        </div>
      </div>

      {/* ── streak ── */}
      {stats.streak > 0 && (
        <div className={`text-center text-sm font-medium animate-bounce ${streakText}`}>
          🔥 רצף של {stats.streak} תשובות נכונות!
        </div>
      )}

      {/* ── question card ── */}
      <div className={[
        "rounded-2xl border px-6 pt-8 pb-6 text-center transition-all duration-150",
        pulse ? cardPulse : cardBase,
        shake ? "animate-shake" : "",
      ].join(" ")}>

        <p className={`text-2xl font-bold leading-relaxed mb-6 ${questionText}`}>
          {question.text}
        </p>

        {/* value display */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className={[
            "w-36 h-14 flex items-center justify-center rounded-xl border-2 text-xl font-bold transition-all",
            stats.showHint
              ? inputHint
              : input ? inputFilled : inputBase,
          ].join(" ")}>
            {input || <span className={`text-base font-normal ${inputPlaceholder}`}>הכנס…</span>}
          </div>
          {question.unit && (
            <span className={`text-xl font-bold ${unitText}`}>{question.unit}</span>
          )}
        </div>

        {!stats.showHint && (
          <Keypad
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={answered && !stats.lastAnswerCorrect}
            spaceMode={spaceMode}
          />
        )}
      </div>

      {/* ── full-solution panel ── */}
      {stats.showHint && (
        <div className={`rounded-2xl border p-6 flex flex-col gap-3 animate-fadein ${hintPanel}`}>
          <p className={`text-base font-bold text-center ${hintTitle}`}>💡 פתרון מלא</p>

          <ol className="flex flex-col gap-2 text-right">
            {question.fullSolution.map((step, i) => (
              <li
                key={i}
                className={[
                  "text-sm leading-relaxed px-3 py-2 rounded-lg",
                  step.startsWith("✅") ? hintStepCorrect : hintStepDefault,
                ].join(" ")}
              >
                {step}
              </li>
            ))}
          </ol>

          <p className={`text-xs text-center ${hintSub}`}>הרמה ירדה — ננסה שוב!</p>
          <button
            onClick={onNext}
            className={`mx-auto px-6 py-2.5 rounded-xl font-bold active:scale-95 transition-all ${hintBtn}`}
          >
            שאלה הבאה ←
          </button>
        </div>
      )}

      {/* ── inline feedback ── */}
      {stats.lastAnswerCorrect === true && !stats.showHint && (
        <div className={`text-center font-bold text-lg animate-fadein ${feedbackCorrect}`}>
          ✅ כל הכבוד!{stats.streak >= 3 ? " 🎉 עלית רמה!" : ""}
        </div>
      )}
      {stats.lastAnswerCorrect === false && !stats.showHint && !answered && (
        <div className={`text-center font-medium animate-fadein ${feedbackWrong}`}>
          ❌ לא מדויק — נסה שוב
        </div>
      )}
    </div>
  );
}
