"use client";

import { useState, useEffect, useCallback } from "react";

const SESSION_KEY = "math_admin_ok";

export default function MathAdminGate({ children }: { children: React.ReactNode }) {
  const [authed,  setAuthed]  = useState<boolean | null>(null);
  const [pw,      setPw]      = useState("");
  const [error,   setError]   = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  const submit = useCallback(async (password: string) => {
    if (!password) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, "1");
        setAuthed(true);
      } else {
        setError(true);
        setPw("");
        setTimeout(() => setError(false), 1500);
      }
    } catch {
      setError(true);
      setPw("");
    } finally {
      setLoading(false);
    }
  }, []);

  if (authed === null) return null;
  if (authed) return <>{children}</>;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 to-[#050d1f] flex flex-col items-center justify-center p-8"
      dir="rtl"
    >
      <div className="mb-8 text-center">
        <div className="text-3xl mb-3">🔐</div>
        <p className="text-cyan-400/60 text-[0.75rem] font-bold tracking-[0.3em] uppercase mb-2">
          ממשק הורים / מורים
        </p>
        <h1 className="text-white/80 text-lg font-bold tracking-wide">
          הכנס סיסמת מנהל
        </h1>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(pw); }}
        className="w-full max-w-xs space-y-3"
      >
        <input
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          placeholder="סיסמה"
          autoFocus
          dir="ltr"
          className={[
            "w-full bg-white/5 border text-cyan-100 text-center text-lg tracking-widest px-4 py-4 rounded-xl",
            "focus:outline-none transition-colors placeholder-white/20",
            error ? "border-red-500/60 focus:border-red-400/60" : "border-cyan-500/20 focus:border-cyan-400/50",
          ].join(" ")}
        />
        {error && (
          <p className="text-red-400 text-sm text-center">סיסמה שגויה — נסה שוב</p>
        )}
        <button
          type="submit"
          disabled={!pw.trim() || loading}
          className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 py-3 rounded-xl font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "מאמת…" : "כניסה"}
        </button>
      </form>

      <p className="mt-10 text-white/15 text-xs tracking-widest uppercase">
        מתמטיקה — תוכנית המחוננים
      </p>
    </div>
  );
}
