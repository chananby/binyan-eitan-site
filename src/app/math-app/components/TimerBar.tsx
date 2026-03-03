"use client";

interface TimerBarProps {
  timeLeft: number;
  total: number;
}

export default function TimerBar({ timeLeft, total }: TimerBarProps) {
  const pct = Math.max(0, (timeLeft / total) * 100);

  const barColor =
    timeLeft > 25 ? "bg-green-500" :
    timeLeft > 10 ? "bg-amber-500" :
    "bg-red-500";

  const textColor =
    timeLeft > 25 ? "text-slate-500" :
    timeLeft > 10 ? "text-amber-600" :
    "text-red-600";

  const urgent = timeLeft <= 10;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={[
        "text-sm font-bold tabular-nums w-8 text-left transition-colors",
        textColor,
        urgent ? "animate-pulse" : "",
      ].join(" ")}>
        {timeLeft}s
      </span>
    </div>
  );
}
