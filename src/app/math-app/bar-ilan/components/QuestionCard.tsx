"use client";

import type { TestQuestion } from "@/src/types/math-test";

interface QuestionCardProps {
  question: TestQuestion;
  questionIndex: number; // 0-based display position
  totalQuestions: number;
  selected: string | null;
  onSelect: (label: string) => void;
  showExplanation?: boolean;
  correctAnswer?: string;
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  selected,
  onSelect,
  showExplanation = false,
  correctAnswer,
}: QuestionCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
      {/* Meta */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-semibold text-brand-500 bg-brand-50 px-2.5 py-1 rounded-full">
          {question.topic_he}
        </span>
        <span className="text-xs text-slate-400 font-medium">
          שאלה {questionIndex + 1} מתוך {totalQuestions}
        </span>
      </div>

      {/* Question text */}
      <p className="text-slate-800 font-semibold text-lg leading-relaxed mb-6">
        {question.question_he}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {question.options.map((opt) => {
          const isSelected = selected === opt.label;
          const isCorrect = showExplanation && opt.label === correctAnswer;
          const isWrong = showExplanation && isSelected && opt.label !== correctAnswer;

          let cls =
            "flex items-center gap-4 rounded-xl border px-4 py-3.5 cursor-pointer transition-all text-right ";

          if (showExplanation) {
            if (isCorrect)
              cls += "bg-green-50 border-green-400 text-green-800";
            else if (isWrong)
              cls += "bg-red-50 border-red-300 text-red-700";
            else
              cls += "border-slate-200 text-slate-500 opacity-60";
          } else if (isSelected) {
            cls += "bg-brand-50 border-brand-400 text-brand-800 shadow-sm";
          } else {
            cls += "border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 text-slate-700";
          }

          return (
            <button
              key={opt.label}
              className={cls}
              onClick={() => !showExplanation && onSelect(opt.label)}
              disabled={showExplanation}
            >
              <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 border-current">
                {opt.label}
              </span>
              <span className="text-sm font-medium leading-snug">{opt.text}</span>
              {showExplanation && isCorrect && (
                <span className="ms-auto text-green-600 text-lg">✓</span>
              )}
              {showExplanation && isWrong && (
                <span className="ms-auto text-red-500 text-lg">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-xs font-bold text-slate-500 mb-1">הסבר:</p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {question.explanation_he}
          </p>
        </div>
      )}
    </div>
  );
}
