"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Loader2, AlertCircle, Check, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPw,   setNewPw]   = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [err,     setErr]     = useState("");

  const noToken = !token.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!newPw || !confirm) return;
    if (newPw.length < 8) {
      setErr("סיסמה חדשה חייבת להיות באורך 8 תווים לפחות.");
      return;
    }
    if (newPw !== confirm) {
      setErr("אישור הסיסמה לא תואם לסיסמה החדשה.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: newPw }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        // Redirect to login after a moment
        setTimeout(() => router.push("/admin"), 2200);
      } else if (res.status === 429) {
        setErr("יותר מדי נסיונות. נסה שוב בעוד כמה דקות.");
      } else if (data.error === "invalid_token") {
        setErr("קישור לא תקף או פג תוקף. בקש/י קישור חדש.");
      } else if (data.error === "password_too_short") {
        setErr("סיסמה חדשה חייבת להיות באורך 8 תווים לפחות.");
      } else {
        setErr("שגיאה בעת איפוס הסיסמה. נסה/י שוב.");
      }
    } catch {
      setErr("שגיאת רשת. נסה/י שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-bone flex flex-col items-center justify-center px-6 gap-8" dir="rtl">
      <div className="absolute top-5 start-5">
        <Link href="/admin" className="flex items-center gap-1 font-body text-xs text-charcoal/55 hover:text-accent transition-colors duration-200">
          <ChevronLeft size={14} strokeWidth={1.5} />
          <span>חזרה להתחברות</span>
        </Link>
      </div>
      <Image src="/logo.png" alt="Binyan Eitan" width={120} height={36} className="h-9 w-auto brightness-0 opacity-60" />

      <div className="w-full max-w-xs space-y-6">
        <div className="text-center space-y-2">
          <KeyRound size={32} strokeWidth={1.2} className="mx-auto text-accent/70" />
          <h1 className="font-heading text-xl font-bold text-charcoal">הגדרת סיסמה חדשה</h1>
        </div>

        {noToken ? (
          <div className="bg-red-50 border border-red-200 p-5 text-center space-y-2">
            <p className="text-sm font-semibold text-red-700">קישור לא תקין</p>
            <p className="text-xs text-red-600 leading-relaxed">
              הקישור הזה לא מכיל token. השתמש בקישור שקיבלת במייל, או בקש/י קישור חדש.
            </p>
            <Link href="/admin/forgot-password" className="inline-block mt-2 text-xs text-accent underline">
              בקש/י קישור חדש
            </Link>
          </div>
        ) : done ? (
          <div className="bg-green-50 border border-green-200 p-5 text-center space-y-2">
            <Check size={24} strokeWidth={2} className="mx-auto text-green-600" />
            <p className="text-sm font-semibold text-green-800">הסיסמה הוחלפה בהצלחה.</p>
            <p className="text-xs text-green-700">מעביר אותך לדף ההתחברות...</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="password"
              autoFocus
              autoComplete="new-password"
              placeholder="סיסמה חדשה (8 תווים לפחות)"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className="w-full border border-charcoal/20 bg-white px-5 py-4 text-center font-body text-base text-charcoal placeholder-charcoal/25 focus:border-accent focus:outline-none transition-colors"
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="אישור סיסמה חדשה"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full border border-charcoal/20 bg-white px-5 py-4 text-center font-body text-base text-charcoal placeholder-charcoal/25 focus:border-accent focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !newPw || !confirm}
              className="w-full bg-accent py-3.5 font-body text-sm font-semibold tracking-[0.18em] uppercase text-bone hover:bg-accent-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> שומר...</> : "שמור סיסמה חדשה"}
            </button>
            {err && (
              <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
                <AlertCircle size={14} strokeWidth={1.5} />{err}
              </div>
            )}
          </form>
        )}
      </div>

      <p className="font-body text-[0.7rem] tracking-widest uppercase text-charcoal/20">
        בניין איתן — פורטל ניהול פנימי
      </p>
    </div>
  );
}
