"use client";

import { useCallback } from "react";

// Synthesise a short tone using the Web Audio API.
// Always called from a user-gesture handler, so AudioContext will start fine.
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.28,
  secondFrequency?: number,
  secondDelay?: number,
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC() as AudioContext;

    function tone(freq: number, startAt: number) {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.connect(vol);
      vol.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startAt);
      vol.gain.setValueAtTime(gain, startAt);
      vol.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.05);
    }

    tone(frequency, ctx.currentTime);
    if (secondFrequency !== undefined && secondDelay !== undefined) {
      tone(secondFrequency, ctx.currentTime + secondDelay);
    }

    // Close context after all tones finish
    setTimeout(() => ctx.close(), (duration + (secondDelay ?? 0) + 0.1) * 1000);
  } catch {
    // AudioContext not supported or blocked — degrade gracefully
  }
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration API not available (iOS Safari, some desktops)
  }
}

export function useFeedback() {
  // Success: single 200 ms vibration + ascending two-note chime (C5 → E5)
  const success = useCallback(() => {
    vibrate(200);
    playTone(523, 0.12, "sine", 0.28, 659, 0.11);
  }, []);

  // Error: two short vibrations + descending two-note buzz (D4 → B3)
  const error = useCallback(() => {
    vibrate([100, 80, 120]);
    playTone(294, 0.18, "sawtooth", 0.2, 247, 0.2);
  }, []);

  return { success, error };
}
