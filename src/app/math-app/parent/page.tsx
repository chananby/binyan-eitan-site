"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfiles } from "../hooks/useProfiles";
import { loadProfileStore, saveProfileStore } from "../lib/profiles";
import { DIFFICULTY_LABELS, type Difficulty, type StoredStats } from "../lib/types";

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
  if (acc >= 0.85 && stats.highestLevel === 3) {
    msg = "🏆 מצוין! הרמה הגבוהה ביותר הושגה עם דיוק גבוה. שקול להוסיף נושאים חדשים.";
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
          <div className="flex gap-3">
            {([1, 2, 3] as Difficulty[]).map((lvl) => (
              <div key={lvl} className={[
                "flex-1 rounded-xl p-3 text-center border",
                lvl <= stats.highestLevel
                  ? "bg-brand-50 border-brand-200 text-brand-700"
                  : "bg-slate-50 border-slate-100 text-slate-300",
              ].join(" ")}>
                <p className="text-lg font-extrabold">{lvl}</p>
                <p className="text-xs font-medium">{DIFFICULTY_LABELS[lvl]}</p>
                {lvl <= stats.highestLevel && <p className="text-base mt-1">✔</p>}
              </div>
            ))}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const { profiles, updateStats } = useProfiles();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string | null>(null);

  // Pick the first profile by default once loaded
  const displayId  = selectedId ?? profiles[0]?.id ?? null;
  const activeProf = profiles.find((p) => p.id === displayId) ?? null;

  const handleDelete = (id: string) => {
    const prof = profiles.find((p) => p.id === id);
    if (!prof) return;
    if (!confirm(`למחוק את כל נתוני ההתקדמות של ${prof.name}? פעולה זו אינה הפיכה.`)) return;

    // Zero out stats for this profile
    const empty: StoredStats = {
      totalCorrect: 0, totalWrong: 0,
      highestLevel: 1, sessionsPlayed: 0,
      pointsTotal: 0, lastPlayed: "",
    };
    // Directly mutate the store (bypassing active-profile guard in updateStats)
    const store = loadProfileStore();
    const next = { ...store, profiles: store.profiles.map((p) => p.id === id ? { ...p, stats: empty } : p) };
    saveProfileStore(next);
    // If it's the active profile, use the hook so state re-renders too
    if (store.activeProfileId === id) updateStats(empty);
    else window.location.reload(); // reload to refresh non-active profile display

    setDeleted(prof.name);
    setTimeout(() => setDeleted(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">

        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">📊 לוח הורה / מורה</h1>
            <p className="text-sm text-slate-400 mt-0.5">סטטיסטיקות מצטברות מכל הסשנים</p>
          </div>
          <Link href="/math-app" className="text-sm text-brand-600 hover:underline font-medium">
            ← לתרגול
          </Link>
        </div>

        {profiles.length === 0 ? (
          <p className="text-center text-slate-400 py-20">
            לא נמצאו פרופילים. <Link href="/math-app" className="text-brand-600 underline">התחל לתרגל ←</Link>
          </p>
        ) : (
          <>
            {/* Profile tabs */}
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

            {/* Sync key hint */}
            {activeProf && (
              <div className="mb-5 text-xs text-slate-400 flex items-center gap-2">
                <span>🔑</span>
                <span>מפתח סנכרון של {activeProf.name}:</span>
                <span className="font-mono font-bold text-slate-600 tracking-wide">
                  {activeProf.syncKey}
                </span>
              </div>
            )}

            {/* Stats for selected profile */}
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
