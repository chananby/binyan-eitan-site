"use client";

import { useState, useEffect, useCallback } from "react";
import type { Profile } from "../lib/profiles";

type View = "list" | "create" | "create-pin" | "created" | "join" | "pin-entry";

const PIN_LEN = 4;
const KEYS    = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

interface ProfileSelectorProps {
  profiles: Profile[];
  syncing: boolean;
  onSelect: (id: string) => void;
  onCreate: (name: string, pin?: string) => Profile;
  onJoin: (syncKey: string) => Promise<Profile | null>;
}

// ── Small PIN keypad (shared between create-pin and pin-entry) ─────────────────

function PinDots({ filled, shake }: { filled: number; shake: boolean }) {
  return (
    <div className={`flex gap-3 justify-center my-2 transition-transform ${shake ? "animate-shake" : ""}`}>
      {Array.from({ length: PIN_LEN }).map((_, i) => (
        <div
          key={i}
          className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
            i < filled
              ? "bg-brand-500 border-brand-500 scale-110"
              : "bg-transparent border-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

function PinKeypad({ onPress }: { onPress: (k: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 w-52 mx-auto" dir="ltr">
      {KEYS.map((key, i) => (
        <button
          key={i}
          onClick={() => onPress(key)}
          disabled={!key}
          className={[
            "h-13 py-3 rounded-2xl text-lg font-bold transition-all active:scale-95 select-none",
            !key
              ? "pointer-events-none"
              : key === "⌫"
              ? "bg-red-50 border border-red-200 text-red-400 hover:bg-red-100"
              : "bg-white border border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50 shadow-sm",
          ].join(" ")}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProfileSelector({
  profiles,
  syncing,
  onSelect,
  onCreate,
  onJoin,
}: ProfileSelectorProps) {
  const [view,            setView]            = useState<View>("list");
  const [nameInput,       setNameInput]       = useState("");
  const [keyInput,        setKeyInput]        = useState("");
  const [createdProfile,  setCreatedProfile]  = useState<Profile | null>(null);
  const [joinError,       setJoinError]       = useState("");
  const [joining,         setJoining]         = useState(false);

  // PIN state (shared between create-pin and pin-entry)
  const [pinInput,        setPinInput]        = useState("");
  const [pinShake,        setPinShake]        = useState(false);
  const [pinError,        setPinError]        = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

  const resetPin = () => { setPinInput(""); setPinShake(false); setPinError(false); };

  // ── Press a PIN key ──────────────────────────────────────────────────────────
  const pressPin = useCallback((key: string) => {
    if (key === "⌫") { setPinInput(p => p.slice(0, -1)); setPinError(false); return; }
    if (!key) return;
    setPinError(false);
    setPinInput(p => p.length < PIN_LEN ? p + key : p);
  }, []);

  // ── Auto-submit CREATE-PIN when full ──────────────────────────────────────────
  useEffect(() => {
    if (view !== "create-pin" || pinInput.length !== PIN_LEN) return;
    const profile = onCreate(nameInput.trim(), pinInput);
    setCreatedProfile(profile);
    resetPin();
    setView("created");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinInput, view]);

  // ── Auto-submit PIN-ENTRY when full ───────────────────────────────────────────
  useEffect(() => {
    if (view !== "pin-entry" || pinInput.length !== PIN_LEN || !pendingProfileId) return;
    const profile = profiles.find(p => p.id === pendingProfileId);
    if (profile?.pin === pinInput) {
      resetPin();
      onSelect(pendingProfileId);
    } else {
      setPinShake(true);
      setPinError(true);
      setTimeout(() => { setPinShake(false); setPinInput(""); }, 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinInput, view]);

  // ── Clicking a profile card ───────────────────────────────────────────────────
  const handlePickProfile = (p: Profile) => {
    if (p.pin) {
      setPendingProfileId(p.id);
      resetPin();
      setView("pin-entry");
    } else {
      onSelect(p.id);
    }
  };

  // ── JOIN ──────────────────────────────────────────────────────────────────────
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

  // ══════════════════════════════════════════════════════════════════════════════
  // LIST
  // ══════════════════════════════════════════════════════════════════════════════
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
                  onClick={() => handlePickProfile(p)}
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
                  <span className={`text-xl flex-shrink-0 ${p.pin ? "text-slate-300" : "text-brand-400 text-2xl font-light"}`}>
                    {p.pin ? "🔒" : "←"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={() => { setNameInput(""); resetPin(); setView("create"); }}
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

  // ══════════════════════════════════════════════════════════════════════════════
  // CREATE — step 1: name
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "create") {
    return (
      <div className="flex flex-col gap-6">
        <button onClick={() => setView("list")} className="text-sm text-slate-400 hover:text-slate-600 self-start transition-colors">
          ← חזרה
        </button>
        <div className="text-center">
          <p className="text-4xl mb-2">✨</p>
          <h2 className="text-xl font-extrabold text-slate-800">פרופיל חדש</h2>
          <p className="text-sm text-slate-500 mt-1">שלב 1 מתוך 2 — איך קוראים לך?</p>
        </div>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && nameInput.trim() && setView("create-pin")}
          placeholder="שם (למשל: נועה)"
          maxLength={20}
          autoFocus
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-center text-lg font-semibold focus:outline-none focus:border-brand-400 bg-white transition-colors"
        />
        <button
          onClick={() => setView("create-pin")}
          disabled={!nameInput.trim()}
          className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-bold text-base disabled:opacity-40 hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
        >
          הבא ← הגדר קוד אישי
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CREATE-PIN — step 2: set PIN
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "create-pin") {
    return (
      <div className="flex flex-col gap-5">
        <button onClick={() => { resetPin(); setView("create"); }} className="text-sm text-slate-400 hover:text-slate-600 self-start transition-colors">
          ← חזרה
        </button>
        <div className="text-center">
          <p className="text-4xl mb-2">🔐</p>
          <h2 className="text-xl font-extrabold text-slate-800">קוד אישי ל{nameInput}</h2>
          <p className="text-sm text-slate-500 mt-1">שלב 2 מתוך 2 — בחר קוד 4 ספרות</p>
        </div>
        <PinDots filled={pinInput.length} shake={pinShake} />
        <PinKeypad onPress={pressPin} />
        <p className="text-xs text-center text-slate-400">הקוד מגן על הפרופיל שלך. זכור אותו!</p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CREATED — show sync key
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "created" && createdProfile) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <p className="text-6xl">{createdProfile.avatar}</p>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">שלום, {createdProfile.name}! 👋</h2>
          <p className="text-sm text-slate-500 mt-1">הפרופיל שלך נוצר בהצלחה</p>
        </div>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-amber-700 mb-3">🔑 מפתח הסנכרון שלך</p>
          <p className="text-2xl font-extrabold text-amber-900 tracking-widest font-mono">
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

  // ══════════════════════════════════════════════════════════════════════════════
  // PIN-ENTRY — unlock existing profile
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === "pin-entry") {
    const pending = profiles.find(p => p.id === pendingProfileId);
    return (
      <div className="flex flex-col gap-5">
        <button onClick={() => { resetPin(); setView("list"); }} className="text-sm text-slate-400 hover:text-slate-600 self-start transition-colors">
          ← חזרה
        </button>
        <div className="text-center">
          <p className="text-5xl mb-2">{pending?.avatar ?? "🔒"}</p>
          <h2 className="text-xl font-extrabold text-slate-800">{pending?.name}</h2>
          <p className="text-sm text-slate-500 mt-1">הכנס את הקוד האישי שלך</p>
        </div>
        <PinDots filled={pinInput.length} shake={pinShake} />
        {pinError && (
          <p className="text-sm text-red-500 text-center -mt-2 animate-fadein">קוד שגוי, נסה שוב</p>
        )}
        <PinKeypad onPress={pressPin} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // JOIN — enter sync key
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => setView("list")} className="text-sm text-slate-400 hover:text-slate-600 self-start transition-colors">
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
        placeholder="לדוגמה: נועה123456"
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
