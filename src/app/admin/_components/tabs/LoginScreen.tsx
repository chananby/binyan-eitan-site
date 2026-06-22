"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Loader2, AlertCircle, LogIn } from "lucide-react";
import SuccessFlash from "../../../components/SuccessFlash";
import { Btn } from "../shared/Btn";

// Two-mode (PIN / password) sign-in screen for the admin portal. Pure
// move from AdminPortal.tsx — every piece of state and every handler
// still lives in the parent and is threaded through props. Type stays
// inline rather than imported from AdminPortal to keep the dependency
// graph linear (AdminPortal → LoginScreen, never the reverse).

type LoginMode = "pin" | "password";

interface Props {
  showFlash: boolean;
  onFlashDone: () => void;

  loginMode: LoginMode;
  setLoginMode: (m: LoginMode) => void;

  pin: string;
  setPin: (v: string) => void;

  email: string;
  setEmail: (v: string) => void;

  password: string;
  setPassword: (v: string) => void;

  loginErr: string;
  setLoginErr: (v: string) => void;

  loginLoading: boolean;

  onPinKey: (digit: string) => void;
  onPinBackspace: () => void;
  onPinLogin: (pin: string) => void | Promise<void>;
  onPasswordLogin: (e: React.FormEvent) => void | Promise<void>;

  // Friendly banner shown above the form when the parent kicked the
  // admin to login due to session expiry. Cleared on first interaction
  // so it doesn't linger after the admin starts typing.
  sessionExpiredMsg?: string | null;
  onClearSessionExpiredMsg?: () => void;
}

export default function LoginScreen(p: Props) {
  return (
    <>
    <SuccessFlash show={p.showFlash} onDone={p.onFlashDone} />
    <div className="relative min-h-screen bg-bone flex flex-col items-center justify-center px-6 gap-8" dir="rtl">
      <div className="absolute top-5 start-5">
        <Link href="/he" className="flex items-center gap-1 font-body text-xs text-charcoal/70 hover:text-accent transition-colors duration-200">
          <ChevronLeft size={14} strokeWidth={1.5} />
          <span>דף הבית</span>
        </Link>
      </div>
      <Image src="/logo.png" alt="Binyan Eitan" width={120} height={36} className="h-9 w-auto brightness-0 opacity-60" />

      {/* Mode tabs */}
      <div className="flex border-b border-charcoal/10 w-full max-w-xs">
        {([["pin", "מנהל עבודה", "PIN"], ["password", "מנהל ראשי", "סיסמה"]] as [LoginMode, string, string][]).map(([mode, label, sub]) => (
          <button key={mode} onClick={() => { p.setLoginMode(mode); p.setPin(""); p.setEmail(""); p.setPassword(""); p.setLoginErr(""); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${p.loginMode === mode ? "border-accent text-accent" : "border-transparent text-charcoal/70 hover:text-charcoal/60"}`}>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-[0.75rem] tracking-widest uppercase text-charcoal/70">{sub}</p>
          </button>
        ))}
      </div>

      {p.sessionExpiredMsg && (
        <div className="w-full max-w-xs flex items-start gap-2 border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="font-body text-xs text-amber-800 leading-snug">{p.sessionExpiredMsg}</p>
        </div>
      )}

      <div className="w-full max-w-xs space-y-6">
        {p.loginMode === "pin" ? (
          <>
            {/* PIN display — 8 circles, max PIN length */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={`w-7 h-7 rounded-full border-2 transition-all duration-150 flex items-center justify-center ${
                  i < p.pin.length ? "border-accent bg-accent scale-110" : "border-charcoal/15 bg-white"
                }`}>
                  {i < p.pin.length && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              ))}
            </div>
            {/* Keypad — dir="ltr" so digits always render 1-2-3 left-to-right */}
            <div className="grid grid-cols-3 gap-2" dir="ltr">
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
                <button key={i} disabled={p.loginLoading || !k}
                  onClick={() => { p.onClearSessionExpiredMsg?.(); k === "⌫" ? p.onPinBackspace() : k && p.onPinKey(k); }}
                  className={`h-14 text-xl font-semibold border transition-all active:scale-95 ${
                    !k ? "invisible" :
                    k === "⌫" ? "border-charcoal/10 text-charcoal/70 hover:border-accent hover:text-accent" :
                    "border-charcoal/15 bg-white text-charcoal hover:border-accent hover:text-accent"
                  } disabled:opacity-40`}>
                  {k}
                </button>
              ))}
            </div>
            {/* Confirm button — visible once ≥4 digits entered */}
            <button
              onClick={() => p.onPinLogin(p.pin)}
              disabled={p.pin.length < 4 || p.loginLoading}
              className="w-full bg-accent py-3.5 font-body text-sm font-semibold tracking-[0.18em] uppercase text-bone hover:bg-accent-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {p.loginLoading
                ? <><Loader2 size={15} className="animate-spin" /> מאמת...</>
                : <><LogIn size={15} /> כניסה</>}
            </button>
          </>
        ) : (
          <form id="admin-login" onSubmit={p.onPasswordLogin} className="space-y-3" dir="rtl" autoComplete="on">
            {/* Explicit name="email"/"password" so Chrome's password
                manager treats this as one form and offers autofill
                exactly once (without name="" it triggers re-detection
                heuristics on every remount). */}
            <input
              type="email"
              name="email"
              autoFocus
              autoComplete="email"
              value={p.email}
              onChange={e => { p.setEmail(e.target.value); p.onClearSessionExpiredMsg?.(); }}
              placeholder="אימייל"
              dir="ltr"
              className="w-full border border-charcoal/20 bg-white px-5 py-4 text-center font-body text-base text-charcoal placeholder-charcoal/25 focus:border-accent focus:outline-none transition-colors"
            />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={p.password}
              onChange={e => { p.setPassword(e.target.value); p.onClearSessionExpiredMsg?.(); }}
              placeholder="סיסמה"
              className="w-full border border-charcoal/20 bg-white px-5 py-4 text-center font-body text-base text-charcoal placeholder-charcoal/25 focus:border-accent focus:outline-none transition-colors"
            />
            <Btn loading={p.loginLoading} disabled={!p.email.trim() || !p.password.trim()}><LogIn size={14} className="inline me-1.5" />כניסה</Btn>
            <div className="text-center pt-1">
              <Link href="/admin/forgot-password" className="text-xs text-charcoal/70 hover:text-accent transition-colors">
                שכחתי סיסמה
              </Link>
            </div>
          </form>
        )}

        {p.loginErr && (
          <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
            <AlertCircle size={14} strokeWidth={1.5} />{p.loginErr}
          </div>
        )}
      </div>

      <p className="font-body text-[0.7rem] tracking-widest uppercase text-charcoal/20">
        בניין איתן — פורטל ניהול פנימי
      </p>
    </div>
    </>
  );
}
