"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import JuniorKeypad from "./JuniorKeypad";
import Confetti from "./Confetti";
import type { MathQuestion } from "../lib/types";
import type { SessionStats } from "../hooks/useAdaptiveEngine";
import { useFeedback } from "../hooks/useFeedback";

interface JuniorCardProps {
  question: MathQuestion;
  stats: SessionStats;
  streakToLevelUp: number;
  onSubmit: (raw: string) => boolean;
  onNext: () => void;
}

const HINT_DELAY_SEC = 10;
const LEVEL_LABELS: Record<number, string> = { 1: "מתחיל 🌱", 2: "מתקדם 🌟", 3: "אלוף 🚀" };

function toSpeakable(text: string): string {
  return text
    .replace(/\n/g, ", ")
    .replace(/—/g, ", ")
    .replace(/(\d+)\/(\d+)\s*מ-?/g, (_, n, d) => {
      const map: Record<string, string> = { "1/2": "חצי", "1/4": "רבע", "3/4": "שלושה רבעי" };
      return (map[`${n}/${d}`] ?? `${n} חלקי ${d}`) + " מ";
    })
    .replace(/½\s*מ-?/g, "חצי מ")
    .replace(/¼\s*מ-?/g, "רבע מ")
    .replace(/¾\s*מ-?/g, "שלושה רבעי מ")
    .replace(/×/g, "כפול")
    .replace(/÷/g, "חלקי")
    .replace(/\+/g, "פלוס")
    .replace(/−/g, "מינוס")
    .replace(/=\s*\?/g, "שווה כמה?")
    .replace(/ס״מ²/g, "סנטימטר בריבוע")
    .replace(/ס״מ/g, "סנטימטר")
    .replace(/₪/g, "שקל");
}

function readAloud(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(toSpeakable(text));
  utt.lang = "he-IL";
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

export default function JuniorCard({ question, stats, streakToLevelUp, onSubmit, onNext }: JuniorCardProps) {
  const { onCorrect, onWrong } = useFeedback();
  const [value, setValue]           = useState("");
  const [shake, setShake]           = useState(false);
  const [confettiBurst, setBurst]   = useState(0);
  const [hintCountdown, setHintCd]  = useState(HINT_DELAY_SEC);
  const [showHintBtn, setShowHintBtn] = useState(false);

  // Reset when question changes
  useEffect(() => {
    setValue("");
    setShake(false);
    setShowHintBtn(false);
    setHintCd(HINT_DELAY_SEC);
  }, [question.id]);

  // Read aloud on question change; cancel on unmount
  useEffect(() => {
    readAloud(question.text);
    return () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); };
  }, [question.id, question.text]);

  // 10-second hint countdown (only when hint not yet shown)
  useEffect(() => {
    if (stats.showHint || showHintBtn) return;
    const id = setInterval(() => {
      setHintCd((prev) => {
        if (prev <= 1) { setShowHintBtn(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [question.id, stats.showHint, showHintBtn]);

  const handleSubmit = useCallback(() => {
    if (!value || stats.showHint) return;
    const correct = onSubmit(value);
    if (correct) {
      onCorrect();
      setBurst((b) => b + 1);
    } else {
      onWrong();
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setValue("");
    }
  }, [value, stats.showHint, onSubmit]);

  // Streak dots (5 dots toward next level-up)
  const dots = Array.from({ length: streakToLevelUp }, (_, i) => i < stats.streak);

  return (
    <>
      <Confetti burst={confettiBurst} />

      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 flex flex-col gap-5"
      >
        {/* Header: level label + streak dots */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 tracking-wide">
            רמה {stats.level} — {LEVEL_LABELS[stats.level]}
          </span>
          <div className="flex items-center gap-1.5" title={`${stats.streak}/${streakToLevelUp} לרמה הבאה`}>
            {dots.map((filled, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.7 }}
                animate={{ scale: filled ? 1.15 : 1 }}
                className={[
                  "w-3 h-3 rounded-full border-2 transition-colors",
                  filled ? "bg-amber-400 border-amber-400" : "bg-slate-100 border-slate-300",
                ].join(" ")}
              />
            ))}
            <span className="text-[0.6rem] text-slate-400 ms-1">⭐ {stats.streak}/{streakToLevelUp}</span>
          </div>
        </div>

        {/* Question text */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <p className="text-3xl font-extrabold text-slate-800 tracking-tight" dir="ltr">
              {question.text}
            </p>
            <button
              onClick={() => readAloud(question.text)}
              className="text-slate-400 hover:text-blue-500 transition-colors text-xl"
              aria-label="קרא בקול"
              title="קרא בקול"
            >
              🔊
            </button>
          </div>
          {question.unit && (
            <p className="text-sm text-slate-400 mt-1">יחידה: {question.unit}</p>
          )}
        </div>

        {/* Answer display */}
        <div className="text-center">
          <div className={[
            "inline-block min-w-[5rem] text-4xl font-bold tracking-widest px-4 py-2 rounded-2xl border-2 transition-colors",
            value ? "border-blue-400 text-blue-600 bg-blue-50" : "border-dashed border-slate-300 text-slate-300",
          ].join(" ")}>
            {value || "___"}
          </div>
        </div>

        {/* Hint area */}
        <AnimatePresence>
          {stats.showHint ? (
            <motion.div
              key="solution"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm space-y-1"
            >
              <p className="font-bold text-amber-700 mb-2">💡 פתרון מלא:</p>
              {question.fullSolution.map((line, i) => (
                <p key={i} className="text-slate-700">{line}</p>
              ))}
              <button
                onClick={onNext}
                className="mt-3 w-full bg-amber-400 hover:bg-amber-300 text-white font-bold py-2.5 rounded-xl transition-colors"
              >
                שאלה הבאה →
              </button>
            </motion.div>
          ) : showHintBtn ? (
            <motion.div
              key="hint-btn"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <button
                onClick={() => readAloud(`רמז. ${question.hint}`)}
                className="text-xs font-semibold text-amber-600 hover:text-amber-500 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full transition-colors"
              >
                💡 רמז: {question.hint}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="hint-countdown"
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="text-xs text-slate-400">
                רמז בעוד {hintCountdown}s…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keypad */}
        {!stats.showHint && (
          <JuniorKeypad
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            disabled={stats.showHint}
          />
        )}

        {/* Session summary */}
        <div className="flex items-center justify-center gap-4 text-sm text-slate-500 border-t border-slate-100 pt-3">
          <span>✅ {stats.correct}</span>
          <span>❌ {stats.wrong}</span>
          <span className="font-bold text-amber-600">⭐ {stats.points} נק׳</span>
        </div>
      </motion.div>
    </>
  );
}
