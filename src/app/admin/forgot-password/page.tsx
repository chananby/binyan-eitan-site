"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Loader2, AlertCircle, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [err,     setErr]     = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 429) {
        setErr("יותר מדי נסיונות. נסה שוב בעוד כמה דקות.");
      } else {
        setDone(true);
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
        <Link href="/admin" className="flex items-center gap-1 font-body text-xs text-charcoal/30 hover:text-accent transition-colors duration-200">
          <ChevronLeft size={14} strokeWidth={1.5} />
          <span>חזרה להתחברות</span>
        </Link>
      </div>
      <Image src="/logo.png" alt="Binyan Eitan" width={120} height={36} className="h-9 w-auto brightness-0 opacity-60" />

      <div className="w-full max-w-xs space-y-6">
        <div className="text-center space-y-2">
          <Mail size={32} strokeWidth={1.2} className="mx-auto text-accent/70" />
          <h1 className="font-heading text-xl font-bold text-charcoal">איפוס סיסמה</h1>
          <p className="text-sm text-charcoal/50 leading-relaxed">
            הזן/י את האימייל שלך ונשלח לך קישור איפוס.
          </p>
        </div>

        {done ? (
          <div className="bg-green-50 border border-green-200 p-5 text-center space-y-2">
            <p className="text-sm font-semibold text-green-800">בקשתך התקבלה.</p>
            <p className="text-xs text-green-700 leading-relaxed">
              אם המייל קיים במערכת, יישלח קישור איפוס למייל זה. הקישור תקף 30 דקות.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              autoFocus
              autoComplete="email"
              dir="ltr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-charcoal/20 bg-white px-5 py-4 text-center font-body text-base text-charcoal placeholder-charcoal/25 focus:border-accent focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-accent py-3.5 font-body text-sm font-semibold tracking-[0.18em] uppercase text-bone hover:bg-accent-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> שולח...</> : "שלח קישור איפוס"}
            </button>
            {err && (
              <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
                <AlertCircle size={14} strokeWidth={1.5} />{err}
              </div>
            )}
          </form>
        )}
      </div>

      <p className="font-body text-[0.55rem] tracking-widest uppercase text-charcoal/20">
        בניין איתן — פורטל ניהול פנימי
      </p>
    </div>
  );
}
