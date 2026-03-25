"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { MilestoneEvent } from "../hooks/useFeedbackEvents";

// ── Message tables ────────────────────────────────────────────────────────────

const STREAK_MSG: Record<number, [string, string]> = {
  3:  ["🔥", "3 ברצף! מדהים!"],
  5:  ["⚡", "5 ברצף! בלתי יאמן!"],
  10: ["👑", "10 ברצף! אלוף!"],
  15: ["🌟", "15 ברצף! גאון!"],
  20: ["🏆", "20 ברצף! מתמטיקאי!"],
};

const SESSION_MSG: Record<number, [string, string]> = {
  5:   ["💪", "5 נכון! המשך כך!"],
  10:  ["🎯", "10 תשובות נכונות!"],
  25:  ["🏅", "25 נכון! מצוין!"],
  50:  ["🥇", "50 נכון! מדהים!"],
  100: ["🦁", "100! אגדה!"],
};

const LEVEL_UP_MSG: Record<number, [string, string]> = {
  2: ["🚀", "עלית לרמה מתקדם!"],
  3: ["🏆", "רמה אלוף! כל הכבוד!"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getContent(event: MilestoneEvent): { emoji: string; text: string; isLevelUp: boolean } {
  if (event.type === "level_up") {
    const [emoji, text] = LEVEL_UP_MSG[event.newLevel] ?? ["🚀", `רמה ${event.newLevel}!`];
    return { emoji, text, isLevelUp: true };
  }
  if (event.type === "streak") {
    const [emoji, text] = STREAK_MSG[event.count] ?? ["🔥", `${event.count} ברצף!`];
    return { emoji, text, isLevelUp: false };
  }
  const [emoji, text] = SESSION_MSG[event.count] ?? ["🎯", `${event.count} נכון!`];
  return { emoji, text, isLevelUp: false };
}

// A unique key so AnimatePresence remounts on each new event.
function eventKey(e: MilestoneEvent): string {
  if (e.type === "level_up")          return `lu-${e.newLevel}`;
  if (e.type === "streak")            return `st-${e.count}`;
  if (e.type === "session_milestone") return `sm-${e.count}`;
  return "evt";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  event: MilestoneEvent | null;
  /** true = Space / Junior dark theme */
  spaceMode?: boolean;
}

export default function MilestoneBanner({ event, spaceMode = false }: Props) {
  return (
    <AnimatePresence>
      {event && (() => {
        const { emoji, text, isLevelUp } = getContent(event);

        // Theme-aware colours
        const bg = spaceMode
          ? isLevelUp
            ? "bg-yellow-400/20 border-yellow-400/50 shadow-yellow-500/10"
            : "bg-cyan-500/10 border-cyan-400/30 shadow-cyan-500/10"
          : isLevelUp
            ? "bg-amber-50 border-amber-300 shadow-amber-100"
            : "bg-brand-50 border-brand-200 shadow-brand-100/50";

        const textCls = spaceMode
          ? isLevelUp ? "text-yellow-200" : "text-cyan-200"
          : isLevelUp ? "text-amber-700"  : "text-brand-700";

        return (
          <motion.div
            key={eventKey(event)}
            initial={{ opacity: 0, y: -14, scale: 0.90 }}
            animate={{ opacity: 1, y: 0,   scale: 1 }}
            exit={{    opacity: 0, y: -10,  scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className={`rounded-2xl border px-5 py-3 flex items-center justify-center gap-3 shadow-md ${bg}`}
            dir="rtl"
          >
            <span className={`text-2xl ${isLevelUp ? "animate-bounce" : ""}`}>{emoji}</span>
            <span className={`font-extrabold text-sm tracking-wide ${textCls}`}>{text}</span>
            {isLevelUp && (
              <span className="text-2xl animate-bounce" style={{ animationDelay: "0.15s" }}>
                {emoji}
              </span>
            )}
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
