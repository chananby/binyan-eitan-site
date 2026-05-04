"use client";

import type { TopicBreakdown } from "@/src/types/math-test";

interface TopicBreakdownProps {
  breakdown: TopicBreakdown;
}

export function TopicBreakdownChart({ breakdown }: TopicBreakdownProps) {
  const entries = Object.entries(breakdown).sort((a, b) => {
    const pctA = a[1].total > 0 ? a[1].correct / a[1].total : 0;
    const pctB = b[1].total > 0 ? b[1].correct / b[1].total : 0;
    return pctA - pctB; // weakest first
  });

  return (
    <div className="space-y-3">
      {entries.map(([topic, { correct, total }]) => {
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        const barColor =
          pct >= 75 ? "bg-green-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400";

        return (
          <div key={topic}>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-slate-600 font-medium">{topic.replace(/_/g, " ")}</span>
              <span className="text-slate-500">
                {correct}/{total} ({pct}%)
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
