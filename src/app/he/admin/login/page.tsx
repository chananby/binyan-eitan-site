"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Loader2, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.ok) {
      router.replace("/he/admin");
    } else {
      setShake(true);
      setError(data.error === "wrong_password" ? "סיסמה שגויה" : "שגיאה — נסה שוב");
      setPassword("");
      setTimeout(() => {
        setShake(false);
        inputRef.current?.focus();
      }, 500);
    }
  }

  return (
    <div className="min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-16 gap-8" dir="rtl">

      <Image
        src="/logo.png"
        alt="Binyan Eitan"
        width={120}
        height={35}
        className="h-8 w-auto brightness-0 opacity-60"
      />

      <div
        className={`w-full max-w-sm transition-transform ${shake ? "animate-[shake_0.4s_ease]" : ""}`}
        style={shake ? { animation: "shake 0.4s ease" } : {}}
      >
        <div className="border border-warm-gray-light bg-white p-8 space-y-6">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-10 h-10 bg-accent/[0.08] flex items-center justify-center">
              <Lock size={18} strokeWidth={1.5} className="text-accent" />
            </div>
            <h1 className="font-heading text-xl font-bold text-charcoal">כניסה לניהול</h1>
            <p className="font-body text-xs text-charcoal/40">
              בנין איתן — ממשק מנהל בלבד
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="sr-only">סיסמת מנהל</label>
              <input
                ref={inputRef}
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="סיסמת מנהל"
                className="w-full border border-charcoal/20 bg-bone px-4 py-4 text-center font-body text-base tracking-[0.3em] text-charcoal placeholder-charcoal/25 focus:border-accent focus:outline-none transition-colors duration-200"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle size={14} strokeWidth={1.5} className="shrink-0" />
                <p className="font-body text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-accent py-4 font-body text-sm font-semibold tracking-[0.2em] uppercase text-bone transition-colors duration-200 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> מאמת...</>
                : "כניסה"}
            </button>
          </form>

        </div>
      </div>

      <p className="font-body text-[0.55rem] tracking-widest uppercase text-charcoal/20">
        בניין איתן — גישה מנהל בלבד
      </p>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
