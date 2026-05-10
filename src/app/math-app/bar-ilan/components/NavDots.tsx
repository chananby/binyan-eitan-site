"use client";

interface NavDotsProps {
  total: number;
  current: number; // 0-based
  answered: Set<string>;
  questionIds: string[];
  onNavigate: (index: number) => void;
}

export function NavDots({
  total,
  current,
  answered,
  questionIds,
  onNavigate,
}: NavDotsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {Array.from({ length: total }, (_, i) => {
        const qId = questionIds[i];
        const isAnswered = answered.has(qId);
        const isCurrent = i === current;

        let cls =
          "w-11 h-11 rounded-full text-sm font-bold transition-all cursor-pointer flex items-center justify-center ";

        if (isCurrent) {
          cls += "bg-brand-600 text-white shadow-md scale-110";
        } else if (isAnswered) {
          cls += "bg-brand-100 text-brand-700 hover:bg-brand-200";
        } else {
          cls += "bg-slate-100 text-slate-400 hover:bg-slate-200";
        }

        return (
          <button
            key={i}
            className={cls}
            onClick={() => onNavigate(i)}
            aria-current={isCurrent ? "step" : undefined}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
