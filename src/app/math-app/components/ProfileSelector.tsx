"use client";

import { useState } from "react";
import type { Profile } from "../lib/profiles";

type View = "list" | "create" | "created" | "join";

interface ProfileSelectorProps {
  profiles: Profile[];
  syncing: boolean;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Profile;
  onJoin: (syncKey: string) => Promise<Profile | null>;
}

export default function ProfileSelector({
  profiles,
  syncing,
  onSelect,
  onCreate,
  onJoin,
}: ProfileSelectorProps) {
  const [view, setView]                   = useState<View>("list");
  const [nameInput, setNameInput]         = useState("");
  const [keyInput, setKeyInput]           = useState("");
  const [createdProfile, setCreatedProfile] = useState<Profile | null>(null);
  const [joinError, setJoinError]         = useState("");
  const [joining, setJoining]             = useState(false);

  const handleCreate = () => {
    const name = nameInput.trim();
    if (!name) return;
    const profile = onCreate(name);
    setCreatedProfile(profile);
    setView("created");
  };

  const handleJoin = async () => {
    const key = keyInput.trim();
    if (!key) return;
    setJoinError("");
    setJoining(true);
    const profile = await onJoin(key);
    setJoining(false);
    if (profile) {
      onSelect(profile.id);
    } else {
      setJoinError("מפתח הסנכרון לא נמצא. בדוק שהקלדת נכון.");
    }
  };

  // ── LIST ───────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <p className="text-4xl mb-2">🧮</p>
          <h1 className="text-2xl font-extrabold text-slate-800">מי מתרגל עכשיו?</h1>
          <p className="text-sm text-slate-500 mt-1">בחר פרופיל או צור חדש</p>
        </div>

        {profiles.length > 0 && (
          <div className="flex flex-col gap-3">
            {profiles.map((p) => {
              const total = p.stats.totalCorrect + p.stats.totalWrong;
              const acc   = total > 0 ? Math.round((p.stats.totalCorrect / total) * 100) : null;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white border-2 border-slate-100 shadow-sm hover:border-brand-400 hover:shadow-md hover:scale-[1.015] transition-all text-right w-full"
                >
                  <span className="text-4xl flex-shrink-0">{p.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-lg leading-tight">{p.name}</p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {total === 0
                        ? "טרם תרגל"
                        : `${p.stats.pointsTotal} נק׳ · ${acc}% דיוק · רמה ${p.stats.highestLevel}`}
                    </p>
                  </div>
                  <span className="text-brand-400 text-2xl font-light">←</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={() => { setNameInput(""); setView("create"); }}
            className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-bold text-base hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
          >
            + צור פרופיל חדש
          </button>
          <button
            onClick={() => { setKeyInput(""); setJoinError(""); setView("join"); }}
            className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 active:scale-95 transition-all"
          >
            🔑 המשך ממכשיר אחר (מפתח סנכרון)
          </button>
        </div>
      </div>
    );
  }

  // ── CREATE ─────────────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="flex flex-col gap-6">
        <button
          onClick={() => setView("list")}
          className="text-sm text-slate-400 hover:text-slate-600 self-start transition-colors"
        >
          ← חזרה
        </button>
        <div className="text-center">
          <p className="text-4xl mb-2">✨</p>
          <h2 className="text-xl font-extrabold text-slate-800">פרופיל חדש</h2>
          <p className="text-sm text-slate-500 mt-1">איך קוראים לך?</p>
        </div>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="שם (למשל: נועה)"
          maxLength={20}
          autoFocus
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-center text-lg font-semibold focus:outline-none focus:border-brand-400 bg-white transition-colors"
        />
        <button
          onClick={handleCreate}
          disabled={!nameInput.trim()}
          className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-bold text-base disabled:opacity-40 hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
        >
          בואו נתחיל! 🚀
        </button>
      </div>
    );
  }

  // ── CREATED (show sync key) ────────────────────────────────────────────────
  if (view === "created" && createdProfile) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <p className="text-6xl">{createdProfile.avatar}</p>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">
            שלום, {createdProfile.name}! 👋
          </h2>
          <p className="text-sm text-slate-500 mt-1">הפרופיל שלך נוצר בהצלחה</p>
        </div>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-amber-700 mb-3">🔑 מפתח הסנכרון שלך</p>
          <p className="text-3xl font-extrabold text-amber-900 tracking-widest font-mono">
            {createdProfile.syncKey}
          </p>
          <p className="text-xs text-amber-600 mt-3 leading-relaxed">
            שמור את המפתח הזה! הוא מאפשר לך להמשיך מכל מכשיר אחר.
          </p>
        </div>
        <button
          onClick={() => onSelect(createdProfile.id)}
          className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-bold text-base hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
        >
          התחל לתרגל ←
        </button>
      </div>
    );
  }

  // ── JOIN ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => setView("list")}
        className="text-sm text-slate-400 hover:text-slate-600 self-start transition-colors"
      >
        ← חזרה
      </button>
      <div className="text-center">
        <p className="text-4xl mb-2">🔑</p>
        <h2 className="text-xl font-extrabold text-slate-800">המשך ממכשיר אחר</h2>
        <p className="text-sm text-slate-500 mt-1">הזן את מפתח הסנכרון שלך</p>
      </div>
      <input
        type="text"
        value={keyInput}
        onChange={(e) => { setKeyInput(e.target.value); setJoinError(""); }}
        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        placeholder="לדוגמה: נועה123"
        autoFocus
        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-center text-lg font-semibold focus:outline-none focus:border-brand-400 bg-white transition-colors"
      />
      {joinError && (
        <p className="text-sm text-red-500 text-center animate-fadein">{joinError}</p>
      )}
      <button
        onClick={handleJoin}
        disabled={!keyInput.trim() || joining || syncing}
        className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-bold text-base disabled:opacity-40 hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
      >
        {joining || syncing ? "מחפש..." : "טען פרופיל ←"}
      </button>
    </div>
  );
}
