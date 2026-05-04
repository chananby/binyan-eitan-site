"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  totalSeconds: number;
  elapsedSeconds: number; // seconds already used before mount
  onExpire: () => void;
}

export function Timer({ totalSeconds, elapsedSeconds, onExpire }: TimerProps) {
  const [elapsed, setElapsed] = useState(elapsedSeconds);

  useEffect(() => {
    if (elapsed >= totalSeconds) {
      onExpire();
      return;
    }
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= totalSeconds) {
          clearInterval(id);
          onExpire();
          return totalSeconds;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = Math.max(0, totalSeconds - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const pct = remaining / totalSeconds;
  const urgent = pct < 0.15;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-bold transition-colors ${
        urgent
          ? "bg-red-100 text-red-700 animate-pulse"
          : "bg-brand-50 text-brand-700"
      }`}
    >
      <span>{urgent ? "⚠️" : "⏱"}</span>
      <span>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
