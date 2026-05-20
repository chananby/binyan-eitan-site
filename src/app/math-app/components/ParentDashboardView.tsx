"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfiles } from "../hooks/useProfiles";
import { loadProfileStore, saveProfileStore, STORE_KEY } from "../lib/profiles";
import { DIFFICULTY_LABELS, type Difficulty, type StoredStats } from "../lib/types";
import { ALL_TOPICS } from "../MathAppClient";

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatCard({ emoji, label, value, sub, accent }: {
  emoji: string; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex flex-col gap-1">
      <p className="text-2xl">{emoji}</p>
      <p className={`text-2xl font-extrabold ${accent ?? "text-slate-800"}`}>{value}</p>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function AccuracyBar({ correct, wrong }: { correct: number; wrong: number }) {
  const total = correct + wrong;
  const pct   = total === 0 ? 0 : Math.round((correct / total) * 100);
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-600">דיוק כללי</p>
        <p className="text-lg font-extrabold text-slate-800">{pct}%</p>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-400">
        <span>✅ {correct} נכון</span>
        <span>❌ {wrong} טעות</span>
      </div>
    </div>
  );
}

function ProgressTip({ stats }: { stats: StoredStats }) {
  const total = stats.totalCorrect + stats.totalWrong;
  if (total === 0) {
    return (
      <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4 border border-slate-200">
        👋 לא נמצאו נתונים עדיין. המתמטיקאי הצעיר טרם התחיל לתרגל.
      </p>
    );
  }
  const acc = stats.totalCorrect / total;
  let msg = "";
  if (acc >= 0.85 && stats.highestLevel >= 4) {
    msg = "🏆 מצוין! רמה גבוהה מאוד הושגה עם דיוק גבוה. שקול להוסיף נושאים חדשים.";
  } else if (acc >= 0.7) {
    msg = "📈 התקדמות יפה! ממשיך לשפר. שמור על הרצף!";
  } else if (acc < 0.5 && total >= 10) {
    msg = "💡 יש מקום לשיפור. מומלץ לתרגל שוב את רמה 1 לפני שממשיכים.";
  } else {
    msg = "✏️ כל שאלה היא צעד קדימה. המשך לתרגל!";
  }
  return (
    <p className="text-sm text-slate-700 bg-brand-50 rounded-xl p-4 border border-brand-200 leading-relaxed">
      {msg}
    </p>
  );
}

function ProfileStats({ stats, name, onDelete }: {
  stats: StoredStats; name: string; onDelete: () => void;
}) {
  const total = stats.totalCorrect + stats.totalWrong;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-slate-400">
        תרגול אחרון: {formatDate(stats.lastPlayed)}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard emoji="⭐" label="נקודות"        value={stats.pointsTotal}  accent="text-amber-500" />
        <StatCard emoji="✅" label="תשובות נכונות" value={stats.totalCorrect} accent="text-green-600" />
        <StatCard emoji="🎯" label="רמה הגבוהה"
          value={DIFFICULTY_LABELS[stats.highestLevel as Difficulty]}
          sub={`רמה ${stats.highestLevel}`} accent="text-brand-600" />
        <StatCard emoji="🔁" label="סשנים" value={stats.sessionsPlayed}
          sub={total > 0 ? `${total} שאלות` : ""} />
      </div>

      <AccuracyBar correct={stats.totalCorrect} wrong={stats.totalWrong} />

      <ProgressTip stats={stats} />

      {total > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-600 mb-3">רמות שהושגו</p>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as Difficulty[]).map((lvl) => (
              <div key={lvl} className={[
                "flex-1 rounded-xl p-2 text-center border",
                lvl <= stats.highestLevel
                  ? lvl >= 5 ? "bg-yellow-50 border-yellow-300 text-yellow-800"
                    : lvl >= 4 ? "bg-purple-50 border-purple-300 text-purple-700"
                    : "bg-brand-50 border-brand-200 text-brand-700"
                  : "bg-slate-50 border-slate-100 text-slate-300",
              ].join(" ")}>
                <p className="text-base font-extrabold">{lvl}</p>
                <p className="text-[0.75rem] font-medium leading-tight">{DIFFICULTY_LABELS[lvl]}</p>
                {lvl <= stats.highestLevel && <p className="text-sm mt-0.5">✔</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-topic breakdown */}
      {stats.topicStats && Object.keys(stats.topicStats).length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-600 mb-3">פירוט לפי נושא</p>
          <div className="flex flex-col divide-y divide-slate-100">
            {ALL_TOPICS.filter((t) => stats.topicStats![t.id]).map((topic) => {
              const ts = stats.topicStats![topic.id];
              const tsTotal = ts.totalCorrect + ts.totalWrong;
              const tsAcc = tsTotal > 0 ? Math.round((ts.totalCorrect / tsTotal) * 100) : null;
              return (
                <div key={topic.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-xl w-7 text-center flex-shrink-0">{topic.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{topic.title}</p>
                    <p className="text-xs text-slate-400">
                      {tsTotal === 0 ? "טרם תרגל" : `${ts.totalCorrect} נכון · ${ts.totalWrong} טעות${tsAcc !== null ? ` · ${tsAcc}% דיוק` : ""}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className={[
                      "text-xs font-bold px-2 py-0.5 rounded-full border",
                      ts.highestLevel >= 5 ? "bg-yellow-50 border-yellow-300 text-yellow-800"
                        : ts.highestLevel >= 4 ? "bg-purple-50 border-purple-200 text-purple-700"
                        : ts.highestLevel === 3 ? "bg-red-50 border-red-200 text-red-600"
                        : ts.highestLevel === 2 ? "bg-amber-50 border-amber-200 text-amber-600"
                        : "bg-green-50 border-green-200 text-green-600",
                    ].join(" ")}>
                      רמה {ts.highestLevel}
                    </span>
                    <span className="text-xs text-amber-500 font-semibold">⭐ {ts.pointsTotal} נק׳</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onDelete}
          className="text-sm text-red-400 hover:text-red-600 transition-colors underline underline-offset-2"
        >
          מחק נתוני {name}
        </button>
      </div>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

interface ParentDashboardViewProps {
  /** Where the "← לתרגול" back link points — either /math-app/junior or /math-app/senior */
  backHref: string;
  /** Which localStorage key to read from — must match the sub-app's storageKey */
  storageKey?: string;
}

export default function ParentDashboardView({ backHref, storageKey = STORE_KEY }: ParentDashboardViewProps) {
  const { profiles, updateStats } = useProfiles(storageKey);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string | null>(null);

  const displayId  = selectedId ?? profiles[0]?.id ?? null;
  const activeProf = profiles.find((p) => p.id === displayId) ?? null;

  const handleDelete = (id: string) => {
    const prof = profiles.find((p) => p.id === id);
    if (!prof) return;
    if (!confirm(`למחוק את כל נתוני ההתקדמות של ${prof.name}? פעולה זו אינה הפיכה.`)) return;

    const empty: StoredStats = {
      totalCorrect: 0, totalWrong: 0,
      highestLevel: 1, sessionsPlayed: 0,
      pointsTotal: 0, lastPlayed: "",
    };
    const store = loadProfileStore(storageKey);
    const next = { ...store, profiles: store.profiles.map((p) => p.id === id ? { ...p, stats: empty } : p) };
    saveProfileStore(next, storageKey);
    if (store.activeProfileId === id) updateStats(empty);
    else window.location.reload();

    setDeleted(prof.name);
    setTimeout(() => setDeleted(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">📊 לוח הורה / מורה</h1>
            <p className="text-sm text-slate-400 mt-0.5">סטטיסטיקות מצטברות מכל הסשנים</p>
          </div>
          <Link href={backHref} className="text-sm text-brand-600 hover:underline font-medium">
            ← לתרגול
          </Link>
        </div>

        {profiles.length === 0 ? (
          <p className="text-center text-slate-400 py-20">
            לא נמצאו פרופילים. <Link href={backHref} className="text-brand-600 underline">התחל לתרגל ←</Link>
          </p>
        ) : (
          <>
            {profiles.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={[
                      "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                      p.id === displayId
                        ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand-300",
                    ].join(" ")}
                  >
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            {activeProf && (
              <div className="mb-5 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 mb-1">
                  🔑 קוד הילד — לשחזור מכשיר אחר
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-extrabold text-xl text-brand-700 tracking-widest select-all">
                    {activeProf.syncKey}
                  </span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(activeProf.syncKey)}
                    className="text-xs text-slate-400 hover:text-brand-600 transition-colors border border-slate-200 rounded-lg px-2 py-1"
                  >
                    העתק
                  </button>
                </div>
                <p className="text-[0.75rem] text-slate-400 mt-1">
                  שמור את הקוד — הקלד אותו במכשיר חדש כדי לשחזר את נתוני {activeProf.name}
                </p>
              </div>
            )}

            {activeProf && (
              <ProfileStats
                stats={activeProf.stats}
                name={activeProf.name}
                onDelete={() => handleDelete(activeProf.id)}
              />
            )}

            {deleted && (
              <p className="text-sm text-green-600 animate-fadein mt-4 text-center">
                הנתונים של {deleted} נמחקו.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
