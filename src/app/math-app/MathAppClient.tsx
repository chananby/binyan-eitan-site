"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import MathCard from "./components/MathCard";
import JuniorCard from "./components/JuniorCard";
import MilestoneBanner from "./components/MilestoneBanner";
import TimerBar from "./components/TimerBar";
import ProfileSelector from "./components/ProfileSelector";
import { useAdaptiveEngine } from "./hooks/useAdaptiveEngine";
import { useFeedbackEvents } from "./hooks/useFeedbackEvents";
import { useProfiles } from "./hooks/useProfiles";
import { generateQuestion as generatePct  } from "./lib/engines/percentages";
import { generateQuestion as generateFrac } from "./lib/engines/fractions";
import { generateQuestion as generateG3   } from "./lib/engines/grade3";
import { generateQuestion as generateDiv  } from "./lib/engines/grade3-division";
import { generateQuestion as generateG4   } from "./lib/engines/grade4";
import { generateQuestion as generateRatios } from "./lib/engines/ratios";
import type { Difficulty, MathQuestion, StoredStats } from "./lib/types";
import type { Profile } from "./lib/profiles";

// ── Topic registry ────────────────────────────────────────────────────────────

export interface Topic {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  badge?: string;
  theme?: "space";
  junior?: boolean;       // uses JuniorCard + JuniorKeypad UX
  generateFn: (d: Difficulty) => MathQuestion;
}

export const ALL_TOPICS: Topic[] = [
  {
    id: "percentages",
    emoji: "💯",
    title: "אחוזים",
    subtitle: "מציאה, הפוך, ושיעור אחוזים",
    generateFn: generatePct,
  },
  {
    id: "fractions",
    emoji: "🍕",
    title: "שברים",
    subtitle: "שברי יחידה, שברים פשוטים ומספרים מעורבים",
    generateFn: generateFrac,
  },
  {
    id: "grade3",
    emoji: "🚀",
    title: "כיתה ג׳ — חלל",
    subtitle: "חיבור, חיסור, לוחות כפל, שברים והיקף ריבוע",
    badge: "כיתה ג׳",
    theme: "space",
    junior: true,
    generateFn: generateG3,
  },
  {
    id: "grade3-division",
    emoji: "➗",
    title: "חלוקה — חלל",
    subtitle: "לוחות חלוקה ÷2 עד ÷10",
    badge: "כיתה ג׳",
    theme: "space",
    junior: true,
    generateFn: generateDiv,
  },
  {
    id: "grade4",
    emoji: "🌟",
    title: "כיתה ד׳ — חלל",
    subtitle: "כפל מורחב, שטח והיקף מלבן",
    badge: "כיתה ד׳",
    theme: "space",
    junior: true,
    generateFn: generateG4,
  },
  {
    id: "ratios",
    emoji: "⚖️",
    title: "יחסים ופרופורציות",
    subtitle: "תעריף יחידה, יחס ישר וקנה מידה",
    generateFn: generateRatios,
  },
];

const TIMER_SECS = 45;

// ── Session ───────────────────────────────────────────────────────────────────

interface SessionProps {
  topic: Topic;
  initialStats: StoredStats;
  onStatsUpdate: (s: StoredStats) => void;
  onBack: () => void;
}

function Session({ topic, initialStats, onStatsUpdate, onBack }: SessionProps) {
  const spaceMode = topic.theme === "space";
  // Use topic-specific highestLevel as starting level (falls back to 1 for new topics)
  const startLevel = (initialStats.topicStats?.[topic.id]?.highestLevel ?? 1) as import("./lib/types").Difficulty;
  const engine = useAdaptiveEngine(
    topic.generateFn,
    initialStats,
    onStatsUpdate,
    startLevel,
    3,
    topic.id,
  );
  const milestone = useFeedbackEvents(engine.stats);

  const [timerMode, setTimerMode] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(TIMER_SECS);

  const timeoutRef = useRef(engine.timeout);
  useEffect(() => { timeoutRef.current = engine.timeout; }, [engine.timeout]);
  useEffect(() => { setTimeLeft(TIMER_SECS); }, [engine.question.id, timerMode]);

  useEffect(() => {
    if (!timerMode || engine.stats.showHint) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { timeoutRef.current(); return TIMER_SECS; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerMode, engine.stats.showHint, engine.question.id]);

  const navBtn      = spaceMode ? "text-cyan-400/70 hover:text-cyan-300" : "text-slate-500 hover:text-slate-700";
  const resetBtn    = spaceMode ? "text-cyan-600/60 hover:text-cyan-400" : "text-slate-400 hover:text-slate-600";
  const summaryCard = spaceMode ? "bg-[#0d1b4e] border-cyan-500/20 text-cyan-200" : "bg-white border-slate-200 text-slate-500";
  const summaryLbl  = spaceMode ? "text-cyan-100 font-semibold" : "text-slate-700 font-semibold";
  const summaryPts  = spaceMode ? "text-yellow-300 font-bold" : "text-amber-600 font-bold";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button onClick={onBack} className={`flex items-center gap-1 transition-colors text-sm font-medium ${navBtn}`}>
          → חזרה לנושאים
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTimerMode((m) => !m)}
            className={[
              "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all",
              timerMode
                ? spaceMode ? "bg-red-950/60 border-red-500/40 text-red-400" : "bg-red-100 border-red-300 text-red-700"
                : spaceMode ? "bg-[#0d1b4e] border-cyan-500/30 text-cyan-500/70 hover:bg-cyan-500/10" : "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200",
            ].join(" ")}
          >
            ⏱ {timerMode ? "מרתון: פועל" : "מרתון: כבוי"}
          </button>
          <button onClick={engine.reset} className={`text-xs transition-colors underline underline-offset-2 ${resetBtn}`}>
            אפס
          </button>
        </div>
      </div>

      {timerMode && !engine.stats.showHint && <TimerBar timeLeft={timeLeft} total={TIMER_SECS} />}

      <MilestoneBanner event={milestone} spaceMode={spaceMode} />

      <MathCard
        question={engine.question}
        stats={engine.stats}
        onSubmit={engine.submit}
        onNext={engine.next}
        spaceMode={spaceMode}
      />

      <div className={`rounded-xl border p-4 text-center text-sm shadow-sm ${summaryCard}`}>
        <span className={summaryLbl}>סיכום סשן: </span>
        {engine.stats.correct} נכון · {engine.stats.wrong} טעות ·{" "}
        <span className={summaryPts}>{engine.stats.points} נק׳</span>
      </div>
    </div>
  );
}

// ── JuniorSession (Grade 3 — kid-friendly UX) ─────────────────────────────────

const STREAK_TO_LEVEL_UP_JUNIOR = 5;

interface JuniorSessionProps {
  topic: Topic;
  initialStats: StoredStats;
  onStatsUpdate: (s: StoredStats) => void;
  onBack: () => void;
}

function JuniorSession({ topic, initialStats, onStatsUpdate, onBack }: JuniorSessionProps) {
  // Use topic-specific highestLevel as starting level (falls back to 1 for new topics)
  const startLevel = (initialStats.topicStats?.[topic.id]?.highestLevel ?? 1) as import("./lib/types").Difficulty;
  const engine = useAdaptiveEngine(
    topic.generateFn,
    initialStats,
    onStatsUpdate,
    startLevel,
    STREAK_TO_LEVEL_UP_JUNIOR,
    topic.id,
  );
  const milestone = useFeedbackEvents(engine.stats);

  const navBtn = "text-cyan-400/70 hover:text-cyan-300";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className={`flex items-center gap-1 transition-colors text-sm font-medium ${navBtn}`}>
          → חזרה לנושאים
        </button>
        <button onClick={engine.reset} className="text-xs text-cyan-600/60 hover:text-cyan-400 transition-colors underline underline-offset-2">
          אפס
        </button>
      </div>

      <MilestoneBanner event={milestone} spaceMode />

      <JuniorCard
        question={engine.question}
        stats={engine.stats}
        streakToLevelUp={STREAK_TO_LEVEL_UP_JUNIOR}
        onSubmit={engine.submit}
        onNext={engine.next}
      />
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

interface DashboardProps {
  profile: Profile;
  topics: Topic[];
  parentHref?: string;
  onPickTopic: (t: Topic) => void;
}

function Dashboard({ profile, topics, parentHref = "/math-app/parent", onPickTopic }: DashboardProps) {
  const total = profile.stats.totalCorrect + profile.stats.totalWrong;

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold mb-4">
          🎓 תוכנית המחוננים — אוניברסיטת בר-אילן
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 mb-1">
          {profile.avatar} שלום, {profile.name}!
        </h1>
        <p className="text-slate-500 text-sm">
          {total === 0 ? "בחר נושא כדי להתחיל" : `${profile.stats.pointsTotal} נק׳ · רמה ${profile.stats.highestLevel} · ${total} שאלות`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {topics.map((topic) => {
          const isSpace = topic.theme === "space";
          return (
            <button
              key={topic.id}
              onClick={() => onPickTopic(topic)}
              className={[
                "rounded-2xl border p-6 text-right transition-all duration-150 flex items-start gap-4 shadow-sm cursor-pointer",
                isSpace
                  ? "bg-[#050d1f] border-cyan-500/30 hover:border-cyan-400 hover:shadow-cyan-500/20 hover:shadow-lg hover:scale-[1.02]"
                  : "bg-white border-slate-200 hover:border-brand-400 hover:shadow-md hover:scale-[1.02]",
              ].join(" ")}
            >
              <span className="text-3xl flex-shrink-0">{topic.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-lg font-bold ${isSpace ? "text-cyan-200" : "text-slate-800"}`}>{topic.title}</p>
                  {topic.badge && (
                    <span className={[
                      "text-[0.6rem] font-bold px-2 py-0.5 rounded-full border tracking-wider uppercase",
                      isSpace ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "bg-brand-50 border-brand-200 text-brand-600",
                    ].join(" ")}>
                      {topic.badge}
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-0.5 ${isSpace ? "text-cyan-500/60" : "text-slate-500"}`}>{topic.subtitle}</p>
              </div>
              {isSpace && <span className="text-xs text-cyan-500/40 self-start mt-1">🌌</span>}
            </button>
          );
        })}
      </div>

    </>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

interface ShellProps {
  children: React.ReactNode;
  activeProfile?: Profile;
  onSwitchProfile?: () => void;
  spaceMode?: boolean;
  parentHref?: string;
  subtitle?: string;
}

export function Shell({ children, activeProfile, onSwitchProfile, spaceMode = false, parentHref = "/math-app/parent", subtitle }: ShellProps) {
  const bg         = spaceMode ? "bg-[#050d1f]" : "bg-gradient-to-br from-slate-50 to-brand-50";
  const logoText   = spaceMode ? "text-cyan-100" : "text-slate-800";
  const logoSub    = spaceMode ? "text-cyan-500/50" : "text-slate-400";
  const switchBtn  = spaceMode
    ? "text-cyan-400/70 hover:text-cyan-300 border-cyan-500/20 bg-[#0d1b4e] hover:border-cyan-400/50"
    : "text-slate-500 hover:text-brand-600 border-slate-200 bg-white hover:border-brand-300";
  const parentLink = spaceMode ? "text-cyan-500/50 hover:text-cyan-300" : "text-slate-400 hover:text-brand-600";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-start py-10 px-4 transition-colors duration-300 ${bg}`}>
      {spaceMode && (
        <div
          className="pointer-events-none fixed inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(1px 1px at 20% 30%, #fff 0%, transparent 100%), radial-gradient(1px 1px at 80% 10%, #fff 0%, transparent 100%), radial-gradient(1.5px 1.5px at 50% 70%, #aef 0%, transparent 100%), radial-gradient(1px 1px at 10% 80%, #fff 0%, transparent 100%), radial-gradient(1px 1px at 90% 60%, #fff 0%, transparent 100%), radial-gradient(1px 1px at 30% 50%, #aef 0%, transparent 100%)" }}
          aria-hidden="true"
        />
      )}
      <div className="relative w-full max-w-2xl">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{spaceMode ? "🚀" : "🧮"}</span>
            <div>
              <p className={`font-extrabold text-lg leading-tight ${logoText}`}>{spaceMode ? "חלל מתמטי" : "מתמטיקה"}</p>
              <p className={`text-xs ${logoSub}`}>{subtitle ?? (spaceMode ? "כיתה ג׳" : "כיתות ה׳–ו׳")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeProfile && onSwitchProfile && (
              <button onClick={onSwitchProfile} title="החלף תלמיד"
                className={`flex items-center gap-1.5 text-xs transition-colors border rounded-full px-3 py-1.5 ${switchBtn}`}>
                <span className="text-base leading-none">{activeProfile.avatar}</span>
                <span className="font-semibold">{activeProfile.name}</span>
                <span className="opacity-50">⇄</span>
              </button>
            )}
            <Link href={parentHref} className={`text-xs transition-colors ${parentLink}`}>הורה / מורה</Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

// ── Main exported client component ────────────────────────────────────────────

interface MathAppClientProps {
  topicIds?: string[];
  parentHref?: string;
  storageKey?: string;
}

export default function MathAppClient({ topicIds, parentHref = "/math-app/parent", storageKey }: MathAppClientProps) {
  const topics = topicIds ? ALL_TOPICS.filter((t) => topicIds.includes(t.id)) : ALL_TOPICS;
  const singleTopic = topics.length === 1;
  // Derive subtitle from topic mix so Shell always shows the correct grade label
  const shellSubtitle = topics.every((t) => t.junior) ? "כיתה ג׳–ד׳" : "כיתות ה׳–ו׳";

  const {
    profiles, activeProfile, syncing,
    createProfile, selectProfile, clearActiveProfile, joinByKey, updateStats,
  } = useProfiles(storageKey);

  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const spaceMode = activeTopic?.theme === "space";

  // When there's only one topic, skip the dashboard and go straight into the session
  useEffect(() => {
    if (singleTopic && activeProfile && !activeTopic) {
      setActiveTopic(topics[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, singleTopic]);

  if (!activeProfile) {
    return (
      <Shell parentHref={parentHref} subtitle={shellSubtitle}>
        <ProfileSelector
          profiles={profiles}
          syncing={syncing}
          onSelect={selectProfile}
          onCreate={createProfile}
          onJoin={joinByKey}
        />
      </Shell>
    );
  }

  if (activeTopic) {
    const handleBack = singleTopic
      ? () => clearActiveProfile()
      : () => setActiveTopic(null);

    return (
      <Shell activeProfile={activeProfile} onSwitchProfile={clearActiveProfile} spaceMode={spaceMode} parentHref={parentHref} subtitle={shellSubtitle}>
        {activeTopic.junior ? (
          <JuniorSession
            topic={activeTopic}
            initialStats={activeProfile.stats}
            onStatsUpdate={updateStats}
            onBack={handleBack}
          />
        ) : (
          <Session
            topic={activeTopic}
            initialStats={activeProfile.stats}
            onStatsUpdate={updateStats}
            onBack={handleBack}
          />
        )}
      </Shell>
    );
  }

  return (
    <Shell activeProfile={activeProfile} onSwitchProfile={clearActiveProfile} parentHref={parentHref} subtitle={shellSubtitle}>
      <Dashboard
        profile={activeProfile}
        topics={topics}
        parentHref={parentHref}
        onPickTopic={setActiveTopic}
      />
    </Shell>
  );
}
