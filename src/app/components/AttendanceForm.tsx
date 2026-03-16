"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogIn, LogOut, MapPin, CheckCircle, AlertCircle, Loader2, ChevronRight } from "lucide-react";

type Step = "phone" | "locating" | "ready" | "submitting" | "success" | "error";

interface GeoCoords {
  lat: number;
  lng: number;
}

function nowLabel() {
  return new Date().toLocaleString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AttendanceForm({ lang = "he" }: { lang?: "he" | "en" }) {
  const portalHref = `/${lang}/internal`;
  const backLabel  = lang === "he" ? "חזור לתפריט הראשי" : "Back to Portal";
  const [step, setStep]             = useState<Step>("phone");
  const [phone, setPhone]           = useState("");
  const [coords, setCoords]         = useState<GeoCoords | null>(null);
  const [geoError, setGeoError]     = useState<string | null>(null);
  const [workerName, setWorkerName]       = useState<string | null>(null);
  const [action, setAction]               = useState<"in" | "out" | null>(null);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [timestamp, setTimestamp]         = useState("");
  const [dailyMessage, setDailyMessage]   = useState<string | null>(null);

  // Step 1 → 2: request GPS
  const requestLocation = useCallback(() => {
    if (!phone.trim() || phone.replace(/\D/g, "").length < 9) return;
    setGeoError(null);
    setStep("locating");

    if (!navigator.geolocation) {
      setGeoError("הדפדפן לא תומך בשיתוף מיקום");
      setStep("phone");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStep("ready");
      },
      () => {
        setGeoError("גישה למיקום נדרשת לדיווח נוכחות — אנא אשר גישה ונסה שוב.");
        setStep("phone");
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  }, [phone]);

  // Step 3: submit action
  const submit = useCallback(async (selectedAction: "in" | "out") => {
    if (!coords) return;
    setAction(selectedAction);
    setStep("submitting");
    const ts = nowLabel();
    setTimestamp(ts);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          action: selectedAction === "in" ? "כניסה" : "יציאה",
          lat: coords.lat.toFixed(6),
          lng: coords.lng.toFixed(6),
          timestamp: ts,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setWorkerName(data.name ?? null);
        setDailyMessage(data.message ?? null);
        setStep("success");
      } else if (data.error === "phone_not_found") {
        setErrorMsg("מספר הטלפון לא נמצא ברשימת הצוות. פנה למנהל.");
        setStep("error");
      } else if (data.error === "webhook_not_configured") {
        setErrorMsg("המערכת לא מוגדרת — פנה למנהל המערכת. (ATTENDANCE_WEBHOOK_URL חסר)");
        setStep("error");
      } else if (data.error === "webhook_unreachable" || data.error === "webhook_error") {
        setErrorMsg("שגיאה בחיבור לשרת הנוכחות — נסה שוב בעוד מספר דקות.");
        setStep("error");
      } else {
        setErrorMsg("שגיאה לא ידועה — נסה שוב.");
        setStep("error");
      }
    } catch {
      setErrorMsg("בעיית תקשורת — בדוק חיבור אינטרנט ונסה שוב.");
      setStep("error");
    }
  }, [coords, phone]);

  const reset = () => {
    setStep("phone");
    setPhone("");
    setCoords(null);
    setGeoError(null);
    setWorkerName(null);
    setAction(null);
    setErrorMsg(null);
    setDailyMessage(null);
  };

  // ── Screens ───────────────────────────────────────────────────────────────

  // Success
  if (step === "success") {
    const isIn = action === "in";
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <CheckCircle
          size={64}
          strokeWidth={1}
          className={isIn ? "text-green-500" : "text-red-400"}
        />

        {/* Greeting */}
        <div className="text-center space-y-1">
          <p className="font-heading text-2xl font-bold text-charcoal">
            {isIn ? "כניסה נרשמה ✅" : "יציאה נרשמה 🔴"}
          </p>
          {workerName && (
            <p className="font-heading text-xl text-charcoal/80">
              שלום {workerName}
            </p>
          )}
          <p className="font-body text-sm text-charcoal/40">{timestamp}</p>
        </div>

        {/* Daily message box */}
        {dailyMessage ? (
          <div className="w-full rounded-sm border border-sky-200 bg-sky-50 px-5 py-4">
            <p className="mb-1 font-body text-[0.6rem] font-bold tracking-[0.18em] uppercase text-sky-400">
              הודעת היום
            </p>
            <p className="font-body text-base leading-relaxed text-charcoal/80">
              {dailyMessage}
            </p>
          </div>
        ) : (
          <p className="font-body text-sm text-charcoal/30">
            {isIn ? "עבודה טובה! 💪" : "שיהיה לך יום נעים 👋"}
          </p>
        )}

        <button
          onClick={reset}
          className="mt-2 w-full border border-charcoal/20 py-4 font-body text-sm font-semibold tracking-wider uppercase text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200"
        >
          דיווח נוסף
        </button>
      </Screen>
    );
  }

  // Error
  if (step === "error") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <AlertCircle size={56} strokeWidth={1} className="text-red-400" />
        <p className="font-body text-center text-sm text-charcoal/70 leading-relaxed max-w-xs">{errorMsg}</p>
        <button onClick={reset}
          className="mt-4 w-full bg-charcoal py-4 font-body text-sm font-semibold tracking-wider uppercase text-bone hover:bg-charcoal/80 transition-colors duration-200">
          נסה שוב
        </button>
      </Screen>
    );
  }

  // Submitting
  if (step === "submitting") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <Loader2 size={48} strokeWidth={1.5} className="text-accent animate-spin" />
        <p className="font-body text-sm text-charcoal/50 tracking-wider">שולח דיווח…</p>
      </Screen>
    );
  }

  // Locating
  if (step === "locating") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <MapPin size={48} strokeWidth={1.5} className="text-accent animate-pulse" />
        <p className="font-body text-sm text-charcoal/50 tracking-wider">מאתר מיקום…</p>
      </Screen>
    );
  }

  // Ready: show IN / OUT buttons
  if (step === "ready" && coords) {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <div className="text-center space-y-1">
          <p className="font-body text-[0.6rem] font-bold tracking-[0.22em] uppercase text-accent/70">מיקום אושר ✓</p>
          <p className="font-body text-sm text-charcoal/50 dir-ltr tabular-nums">
            {phone}
          </p>
        </div>

        <div className="w-full grid grid-cols-2 gap-4">
          <button onClick={() => submit("in")}
            className="flex flex-col items-center justify-center gap-3 bg-green-600 hover:bg-green-700 active:scale-95 py-8 transition-all duration-150 rounded-sm">
            <LogIn size={32} strokeWidth={1.5} className="text-white" />
            <span className="font-heading text-lg font-bold text-white">כניסה</span>
          </button>
          <button onClick={() => submit("out")}
            className="flex flex-col items-center justify-center gap-3 bg-red-500 hover:bg-red-600 active:scale-95 py-8 transition-all duration-150 rounded-sm">
            <LogOut size={32} strokeWidth={1.5} className="text-white" />
            <span className="font-heading text-lg font-bold text-white">יציאה</span>
          </button>
        </div>

        <button onClick={reset}
          className="font-body text-xs text-charcoal/30 hover:text-charcoal/60 transition-colors duration-200 underline underline-offset-2">
          שנה מספר
        </button>
      </Screen>
    );
  }

  // Phone entry (default)
  return (
    <Screen backHref={portalHref} backLabel={backLabel}>
      <div className="text-center space-y-1">
        <p className="font-heading text-xl font-bold text-charcoal">שעון נוכחות</p>
        <p className="font-body text-xs text-charcoal/40">הזן מספר טלפון לזיהוי</p>
      </div>

      <div className="w-full space-y-4">
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && requestLocation()}
          placeholder="05X-XXX-XXXX"
          className="w-full border border-charcoal/20 bg-white px-5 py-5 text-center font-body text-xl tracking-widest text-charcoal placeholder-charcoal/20 focus:border-accent focus:outline-none transition-colors duration-200"
          autoComplete="tel"
          dir="ltr"
        />

        {geoError && (
          <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
            <p className="font-body text-xs text-red-600 leading-snug">{geoError}</p>
          </div>
        )}

        <button
          onClick={requestLocation}
          disabled={phone.replace(/\D/g, "").length < 9}
          className="w-full bg-accent py-5 font-heading text-base font-bold tracking-[0.15em] uppercase text-bone transition-colors duration-200 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <MapPin size={18} strokeWidth={1.5} />
          אשר מיקום והמשך
        </button>
      </div>
    </Screen>
  );
}

// ── Layout shell ──────────────────────────────────────────────────────────────

function Screen({
  children,
  backHref,
  backLabel,
}: {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-16 gap-6" dir="rtl">
      {/* Back button — top-right in RTL */}
      {backHref && (
        <div className="absolute top-5 end-5">
          <Link
            href={backHref}
            className="flex items-center gap-1 font-body text-xs text-charcoal/35 hover:text-accent transition-colors duration-200"
          >
            <ChevronRight size={14} strokeWidth={1.5} />
            <span>{backLabel}</span>
          </Link>
        </div>
      )}

      <Link href={backHref ?? "/he/internal"} className="mb-2">
        <Image src="/logo.png" alt="Binyan Eitan" width={110} height={32} className="h-8 w-auto brightness-0 opacity-60" />
      </Link>
      {children}
      <p className="mt-6 font-body text-[0.55rem] tracking-widest uppercase text-charcoal/20">
        בניין איתן — מערכת נוכחות פנימית
      </p>
    </div>
  );
}
