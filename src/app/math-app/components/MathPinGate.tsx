"use client";

import { useState, useEffect, useCallback } from "react";

// ── Change this to set the access PIN ──────────────────────────────────────
const ACCESS_PIN = "1234";
const SESSION_KEY = "math_pin_ok";
// ───────────────────────────────────────────────────────────────────────────

const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

export default function MathPinGate({ children }: { children: React.ReactNode }) {
  const [authed,  setAuthed]  = useState<boolean | null>(null); // null = checking
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState(false);
  const [shake,   setShake]   = useState(false);

  // Check session on mount
  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    setAuthed(ok);
  }, []);

  const submit = useCallback(() => {
    if (pin === ACCESS_PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    }
  }, [pin]);

  const press = useCallback((key: string) => {
    if (key === "⌫") { setPin(p => p.slice(0, -1)); setError(false); return; }
    if (!key) return;
    setError(false);
    setPin(p => p.length < ACCESS_PIN.length ? p + key : p);
  }, []);

  // Auto-submit when pin length matches
  useEffect(() => {
    if (pin.length === ACCESS_PIN.length) submit();
  }, [pin, submit]);

  if (authed === null) return null; // flash prevention
  if (authed) return <>{children}</>;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 to-[#050d1f] flex flex-col items-center justify-center p-8"
      dir="rtl"
    >
      {/* Logo / title */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-3">🎓</div>
        <p className="text-cyan-400/60 text-[0.75rem] font-bold tracking-[0.3em] uppercase mb-1">
          תוכנית המחוננים
        </p>
        <h1 className="text-white/80 text-lg font-bold tracking-wide">
          הכנס קוד כניסה
        </h1>
      </div>

      {/* Dots */}
      <div className={`flex gap-3 mb-6 transition-transform ${shake ? "animate-shake" : ""}`}>
        {Array.from({ length: ACCESS_PIN.length }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? "bg-cyan-400 border-cyan-400 scale-110"
                : "bg-transparent border-cyan-500/30"
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm mb-4 font-medium">קוד שגוי, נסה שוב</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2.5 w-56" dir="ltr">
        {KEYS.map((key, i) => (
          <button
            key={i}
            onClick={() => press(key)}
            disabled={!key}
            className={[
              "h-14 rounded-2xl text-lg font-bold transition-all duration-100 active:scale-95 select-none",
              !key
                ? "pointer-events-none"
                : key === "⌫"
                ? "bg-red-950/60 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                : "bg-white/5 border border-cyan-500/20 text-cyan-100 hover:bg-cyan-500/10",
            ].join(" ")}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
