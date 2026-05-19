import { useRef, useState, useEffect } from "react";
import type { SessionStats } from "./useAdaptiveEngine";

// ── Event types ───────────────────────────────────────────────────────────────

export type MilestoneEvent =
  | { type: "level_up"; newLevel: number }
  | { type: "streak"; count: number }
  | { type: "session_milestone"; count: number };

// ── Thresholds ────────────────────────────────────────────────────────────────

const STREAK_MILESTONES  = new Set([3, 5, 10, 15, 20]);
const SESSION_MILESTONES = new Set([5, 10, 25, 50, 100]);

const BANNER_DURATION_MS = 2800;

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Watches SessionStats and fires a MilestoneEvent whenever a meaningful
 * threshold is crossed (level-up, streak milestone, session correct milestone).
 *
 * Priority: level_up > streak > session_milestone
 * The event auto-clears after BANNER_DURATION_MS.
 */
export function useFeedbackEvents(stats: SessionStats): MilestoneEvent | null {
  // Track the last-seen values so we only fire on *new* crossings.
  const prevLevel   = useRef(stats.level);
  const prevStreak  = useRef(stats.streak);
  const prevCorrect = useRef(stats.correct);

  const [event, setEvent] = useState<MilestoneEvent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const pl = prevLevel.current;
    const ps = prevStreak.current;
    const pc = prevCorrect.current;

    // Update refs first so they are always current on the next run.
    prevLevel.current   = stats.level;
    prevStreak.current  = stats.streak;
    prevCorrect.current = stats.correct;

    let next: MilestoneEvent | null = null;

    if (stats.level > pl) {
      // Level-up trumps everything else.
      next = { type: "level_up", newLevel: stats.level };
    } else if (stats.streak > ps && STREAK_MILESTONES.has(stats.streak)) {
      next = { type: "streak", count: stats.streak };
    } else if (stats.correct > pc && SESSION_MILESTONES.has(stats.correct)) {
      next = { type: "session_milestone", count: stats.correct };
    }

    if (next) {
      setEvent(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setEvent(null), BANNER_DURATION_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.level, stats.streak, stats.correct]);

  return event;
}
