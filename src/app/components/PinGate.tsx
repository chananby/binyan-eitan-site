"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Delete } from "lucide-react";

const SESSION_KEY = "be_internal_auth";
const PIN_LENGTH  = 4;

const T = {
  he: {
    title:    "אזור צוות",
    subtitle: "הזן קוד לכניסה",
    wrong:    "קוד שגוי",
    footer:   "בניין איתן — גישה פנימית בלבד",
  },
  en: {
    title:    "Staff Portal",
    subtitle: "Enter PIN to continue",
    wrong:    "Incorrect PIN",
    footer:   "Binyan Eitan — Internal Access Only",
  },
} as const;

type Lang = keyof typeof T;

export default function PinGate({ children, lang = "he" }: { children: React.ReactNode; lang?: Lang }) {
  const t        = T[lang];
  const router   = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed]       = useState(false);
  const [ready, setReady]         = useState(false); // avoid SSR flash
  const [digits, setDigits]       = useState<string[]>([]);
  const [shaking, setShaking]     = useState(false);
  const [errored, setErrored]     = useState(false);
  const [checking, setChecking]   = useState(false);

  // Check sessionStorage on mount
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") setAuthed(true);
    setReady(true);
  }, []);

  const verify = useCallback(async (code: string) => {
    setChecking(true);
    try {
      const res  = await fetch("/api/internal-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, "1");
        // Replace current history entry so back button skips the PIN screen
        router.replace(pathname);
        setAuthed(true);
      } else {
        setShaking(true);
        setErrored(true);
        setDigits([]);
        setTimeout(() => { setShaking(false); setErrored(false); }, 700);
      }
    } catch {
      setShaking(true);
      setDigits([]);
      setTimeout(() => setShaking(false), 700);
    } finally {
      setChecking(false);
    }
  }, []);

  const press = useCallback((d: string) => {
    setDigits((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = [...prev, d];
      if (next.length === PIN_LENGTH) verify(next.join(""));
      return next;
    });
  }, [verify]);

  const del = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1));
    setErrored(false);
  }, []);

  // Physical keyboard support
  useEffect(() => {
    if (authed || !ready) return;
    const handler = (e: KeyboardEvent) => {
      if (checking) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace" || e.key === "Delete") del();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [authed, ready, checking, press, del]);

  if (!ready) return null;
  if (authed) return <>{children}</>;

  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];

  return (
    <div className="min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-12 gap-8" dir={lang === "he" ? "rtl" : "ltr"}>

      {/* Logo */}
      <Image
        src="/logo.png"
        alt="Binyan Eitan"
        width={110}
        height={32}
        className="h-8 w-auto brightness-0 opacity-50"
      />

      {/* Label */}
      <div className="text-center space-y-1">
        <p className="font-heading text-lg font-bold text-charcoal tracking-wide">{t.title}</p>
        <p className="font-body text-xs text-charcoal/40 tracking-widest uppercase">{t.subtitle}</p>
      </div>

      {/* Dot indicators */}
      <div
        className={`flex items-center gap-4 transition-transform duration-100 ${shaking ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
        style={{ animationDuration: "0.4s" }}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
              i < digits.length
                ? errored
                  ? "border-red-400 bg-red-400"
                  : "border-accent bg-accent"
                : "border-charcoal/20 bg-transparent"
            }`}
          />
        ))}
      </div>

      {errored && (
        <p className="font-body text-xs text-red-400 -mt-4 tracking-wide">{t.wrong}</p>
      )}

      {/* Keypad — always LTR so digits render 1-2-3 left-to-right regardless of page dir */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]" dir="ltr">
        {keys.map((k, i) => {
          if (k === "") return <div key={i} />;

          if (k === "del") {
            return (
              <button
                key="del"
                onClick={del}
                disabled={digits.length === 0 || checking}
                className="flex items-center justify-center h-16 rounded-sm border border-charcoal/12 bg-white text-charcoal/40 hover:border-charcoal/25 hover:text-charcoal/60 disabled:opacity-30 transition-all duration-150 active:scale-95"
                aria-label="Delete"
              >
                <Delete size={18} strokeWidth={1.5} />
              </button>
            );
          }

          return (
            <button
              key={k}
              onClick={() => press(k)}
              disabled={digits.length >= PIN_LENGTH || checking}
              className="flex items-center justify-center h-16 rounded-sm border border-charcoal/12 bg-white font-heading text-xl font-semibold text-charcoal hover:border-accent/50 hover:text-accent disabled:opacity-30 transition-all duration-150 active:scale-95 select-none"
            >
              {k}
            </button>
          );
        })}
      </div>

      <p className="font-body text-[0.55rem] tracking-[0.2em] uppercase text-charcoal/20 mt-2">
        {t.footer}
      </p>

      {/* Shake keyframes injected inline */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
