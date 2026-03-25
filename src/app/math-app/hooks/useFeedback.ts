"use client";

/** Plays a short beep via Web Audio API. No external files needed. */
function playBeep(type: "correct" | "wrong") {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const notes = type === "correct"
      ? [523, 659, 784]   // C5 - E5 - G5  (happy ascending)
      : [330, 262];       // E4 - C4        (low descending)

    const dur = 0.09; // seconds per note
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = type === "correct" ? "sine" : "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * dur);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * dur);
      osc.stop(ctx.currentTime + i * dur + dur);
    });

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + notes.length * dur + 0.05,
    );
  } catch {
    // AudioContext not available (SSR / restricted context) — silent fail
  }
}

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}

/** Returns stable callbacks — safe to call inside event handlers. */
export function useFeedback() {
  return {
    onCorrect: () => { playBeep("correct"); vibrate(50); },
    onWrong:   () => { playBeep("wrong");   vibrate([80, 40, 80]); },
  };
}
