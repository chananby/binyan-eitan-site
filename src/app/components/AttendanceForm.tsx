"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogIn, LogOut, MapPin, CheckCircle, AlertCircle, Loader2, ChevronRight, RefreshCw, UserPlus, Lock } from "lucide-react";

type Step = "phone" | "locating" | "ready" | "submitting" | "success" | "error";
type AdminView = "none" | "password" | "dashboard";

interface GeoCoords { lat: number; lng: number; }

interface StaffMember {
  id: string; name: string; phone: string; role: string; active: boolean;
}
interface AttendanceRecord {
  id: string; action: string; timestamp_label: string; recorded_at: string;
  staff: { id: string; name: string; phone: string } | null;
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

  // ── Attendance state ──────────────────────────────────────────────────────
  const [step, setStep]                   = useState<Step>("phone");
  const [phone, setPhone]                 = useState("");
  const [coords, setCoords]               = useState<GeoCoords | null>(null);
  const [geoError, setGeoError]           = useState<string | null>(null);
  const [workerName, setWorkerName]       = useState<string | null>(null);
  const [action, setAction]               = useState<"in" | "out" | null>(null);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [timestamp, setTimestamp]         = useState("");
  const [dailyMessage, setDailyMessage]   = useState<string | null>(null);
  const [autoRegistered, setAutoRegistered] = useState(false);

  // ── Admin state ───────────────────────────────────────────────────────────
  const [adminView, setAdminView]         = useState<AdminView>("none");
  const [adminPw, setAdminPw]             = useState("");
  const [adminErr, setAdminErr]           = useState("");
  const [adminLoading, setAdminLoading]   = useState(false);

  const [staff, setStaff]                 = useState<StaffMember[]>([]);
  const [todayLogs, setTodayLogs]         = useState<AttendanceRecord[]>([]);
  const [dataLoading, setDataLoading]     = useState(false);

  const [newName, setNewName]   = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole]   = useState("פועל");
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg]         = useState("");

  // Restore admin session across page refreshes
  useEffect(() => {
    if (sessionStorage.getItem("be_admin") === "1") {
      setAdminView("dashboard");
    }
  }, []);

  // Load data when entering dashboard
  useEffect(() => {
    if (adminView === "dashboard") loadAdminData();
  }, [adminView]);

  async function loadAdminData() {
    setDataLoading(true);
    try {
      const [staffRes, logsRes] = await Promise.all([
        fetch("/api/admin/staff"),
        fetch("/api/admin/attendance/today"),
      ]);
      if (staffRes.ok) {
        const d = await staffRes.json();
        setStaff(d.staff ?? []);
      }
      if (logsRes.ok) {
        const d = await logsRes.json();
        setTodayLogs(d.records ?? []);
      }
    } finally {
      setDataLoading(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAdminLoading(true);
    setAdminErr("");
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPw }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem("be_admin", "1");
        setAdminView("dashboard");
        setAdminPw("");
      } else {
        setAdminErr("סיסמה שגויה");
        setAdminPw("");
      }
    } catch {
      setAdminErr("שגיאת רשת");
    } finally {
      setAdminLoading(false);
    }
  }

  function handleAdminLogout() {
    sessionStorage.removeItem("be_admin");
    setAdminView("none");
    setStaff([]);
    setTodayLogs([]);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    loadAdminData();
  }

  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddMsg("");
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phone: newPhone, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddMsg("✓ " + newName + " נוסף");
        setNewName(""); setNewPhone(""); setNewRole("פועל");
        loadAdminData();
      } else {
        setAddMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch (err) {
      setAddMsg("שגיאת רשת: " + String(err));
    } finally {
      setAddLoading(false);
    }
  }

  // ── Admin: Password screen ────────────────────────────────────────────────
  if (adminView === "password") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <Lock size={40} strokeWidth={1.5} className="text-accent" />
        <div className="text-center space-y-1">
          <p className="font-heading text-xl font-bold text-charcoal">ניהול עובדים</p>
          <p className="font-body text-xs text-charcoal/40">הזן סיסמת מנהל</p>
        </div>
        <form onSubmit={handleAdminLogin} className="w-full space-y-4">
          <input
            type="password"
            autoFocus
            value={adminPw}
            onChange={e => setAdminPw(e.target.value)}
            placeholder="סיסמה"
            className="w-full border border-charcoal/20 bg-white px-5 py-4 text-center font-body text-lg tracking-[0.3em] text-charcoal placeholder-charcoal/20 focus:border-accent focus:outline-none transition-colors duration-200"
          />
          {adminErr && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle size={14} strokeWidth={1.5} className="shrink-0" />
              <p className="font-body text-xs">{adminErr}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={adminLoading || !adminPw.trim()}
            className="w-full bg-accent py-4 font-body text-sm font-semibold tracking-[0.2em] uppercase text-bone transition-colors duration-200 hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {adminLoading ? <><Loader2 size={16} className="animate-spin" /> מאמת...</> : "כניסה"}
          </button>
        </form>
        <button
          onClick={() => setAdminView("none")}
          className="font-body text-xs text-charcoal/30 hover:text-charcoal/60 transition-colors underline underline-offset-2"
        >
          חזור לשעון נוכחות
        </button>
      </Screen>
    );
  }

  // ── Admin: Dashboard ──────────────────────────────────────────────────────
  if (adminView === "dashboard") {
    const activeStaff   = staff.filter(s => s.active);
    const inactiveStaff = staff.filter(s => !s.active);
    const todayIns  = todayLogs.filter(r => r.action === "כניסה").length;
    const todayOuts = todayLogs.filter(r => r.action === "יציאה").length;

    return (
      <div dir="rtl" className="min-h-screen bg-bone px-4 py-8 font-body text-charcoal">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.6rem] font-bold tracking-[0.2em] uppercase text-accent/60">בנין איתן</p>
              <h1 className="font-heading text-2xl font-bold text-charcoal">ניהול עובדים</h1>
            </div>
            <button
              onClick={handleAdminLogout}
              className="border border-charcoal/20 px-3 py-1.5 text-xs text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200"
            >
              יציאה
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "פעילים", value: activeStaff.length, color: "text-green-600" },
              { label: "לא פעילים", value: inactiveStaff.length, color: "text-charcoal/40" },
              { label: "כניסות היום", value: todayIns, color: "text-accent" },
              { label: "יציאות היום", value: todayOuts, color: "text-red-400" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-warm-gray-light p-3 text-center">
                <div className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[0.65rem] text-charcoal/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Add Worker */}
          <div className="bg-white border border-warm-gray-light p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus size={16} strokeWidth={1.5} className="text-accent" />
              <h2 className="font-heading text-base font-bold">הוספת עובד</h2>
            </div>
            <form onSubmit={handleAddWorker} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[0.7rem] text-charcoal/50">שם מלא</label>
                  <input
                    value={newName} onChange={e => setNewName(e.target.value)} required
                    placeholder="ישראל ישראלי"
                    className="w-full border border-charcoal/15 bg-bone px-3 py-2.5 text-sm focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.7rem] text-charcoal/50">טלפון</label>
                  <input
                    value={newPhone} onChange={e => setNewPhone(e.target.value)} required
                    placeholder="05X-XXXXXXX" type="tel"
                    className="w-full border border-charcoal/15 bg-bone px-3 py-2.5 text-sm focus:border-accent focus:outline-none transition-colors"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[0.7rem] text-charcoal/50">תפקיד</label>
                <select
                  value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="w-full border border-charcoal/15 bg-bone px-3 py-2.5 text-sm focus:border-accent focus:outline-none transition-colors"
                >
                  <option>פועל</option>
                  <option>מנהל עבודה</option>
                  <option>קבלן משנה</option>
                  <option>מנהל</option>
                </select>
              </div>
              <button
                type="submit" disabled={addLoading}
                className="w-full bg-accent py-3 text-sm font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors duration-200"
              >
                {addLoading ? "מוסיף..." : "הוסף עובד"}
              </button>
              {addMsg && (
                <p className={`text-xs ${addMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{addMsg}</p>
              )}
            </form>
          </div>

          {/* Staff List */}
          <div className="bg-white border border-warm-gray-light p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-bold">רשימת עובדים ({staff.length})</h2>
              <button onClick={loadAdminData} className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-accent transition-colors">
                <RefreshCw size={12} strokeWidth={1.5} />
                רענן
              </button>
            </div>
            {dataLoading && <p className="text-sm text-charcoal/40 text-center py-4">טוען...</p>}
            {!dataLoading && staff.length === 0 && (
              <p className="text-sm text-charcoal/30 text-center py-4">אין עובדים רשומים</p>
            )}
            {!dataLoading && staff.length > 0 && (
              <div className="divide-y divide-charcoal/5">
                {staff.map(s => (
                  <div key={s.id} className={`flex items-center justify-between py-3 gap-3 ${!s.active ? "opacity-45" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-charcoal truncate">{s.name}</p>
                      <p className="text-[0.7rem] text-charcoal/40 tabular-nums" dir="ltr">{s.phone}</p>
                    </div>
                    <span className="text-[0.65rem] text-charcoal/40 shrink-0">{s.role}</span>
                    <span className={`text-[0.65rem] px-2 py-0.5 shrink-0 ${s.active ? "bg-green-50 text-green-600" : "bg-charcoal/5 text-charcoal/40"}`}>
                      {s.active ? "פעיל" : "לא פעיל"}
                    </span>
                    <button
                      onClick={() => toggleActive(s.id, s.active)}
                      className="text-[0.7rem] border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0"
                    >
                      {s.active ? "השבת" : "הפעל"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Logs */}
          <div className="bg-white border border-warm-gray-light p-5 space-y-4">
            <h2 className="font-heading text-base font-bold">יומן היום</h2>
            {dataLoading && <p className="text-sm text-charcoal/40 text-center py-4">טוען...</p>}
            {!dataLoading && todayLogs.length === 0 && (
              <p className="text-sm text-charcoal/30 text-center py-4">אין דיווחים היום</p>
            )}
            {!dataLoading && todayLogs.length > 0 && (
              <div className="divide-y divide-charcoal/5">
                {todayLogs.map(r => {
                  const isIn = r.action === "כניסה";
                  const time = r.timestamp_label
                    ? r.timestamp_label
                    : new Date(r.recorded_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{r.staff?.name ?? "—"}</p>
                        <p className="text-[0.65rem] text-charcoal/35 tabular-nums" dir="ltr">{r.staff?.phone ?? ""}</p>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${isIn ? "text-green-600" : "text-red-400"}`}>
                        {r.action}
                      </span>
                      <span className="text-[0.7rem] text-charcoal/35 tabular-nums shrink-0" dir="ltr">{time}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Back to attendance */}
          <button
            onClick={handleAdminLogout}
            className="w-full border border-charcoal/20 py-3 text-xs tracking-widest uppercase text-charcoal/40 hover:border-accent hover:text-accent transition-colors duration-200"
          >
            חזור לשעון נוכחות
          </button>

        </div>
      </div>
    );
  }

  // ── Attendance screens ────────────────────────────────────────────────────

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
        setAutoRegistered(data.auto_registered ?? false);
        setStep("success");
      } else if (data.error === "phone_not_found") {
        setErrorMsg("מספר הטלפון לא נמצא ברשימת הצוות. פנה למנהל.");
        setStep("error");
      } else {
        setErrorMsg(data.error ?? "שגיאה לא ידועה — נסה שוב.");
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
    setAutoRegistered(false);
  };

  if (step === "success") {
    const isIn = action === "in";
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <CheckCircle size={64} strokeWidth={1} className={isIn ? "text-green-500" : "text-red-400"} />
        <div className="text-center space-y-1">
          <p className="font-heading text-2xl font-bold text-charcoal">
            {isIn ? "כניסה נרשמה ✅" : "יציאה נרשמה 🔴"}
          </p>
          {workerName && <p className="font-heading text-xl text-charcoal/80">שלום {workerName}</p>}
          <p className="font-body text-sm text-charcoal/40">{timestamp}</p>
        </div>
        {autoRegistered && (
          <div className="w-full rounded-sm border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="mb-1 font-body text-[0.6rem] font-bold tracking-[0.18em] uppercase text-amber-500">רישום אוטומטי</p>
            <p className="font-body text-sm leading-relaxed text-charcoal/80">הטלפון נרשם כמשתמש ראשון במערכת. עדכן את שמך בדשבורד הניהולי.</p>
          </div>
        )}
        {dailyMessage ? (
          <div className="w-full rounded-sm border border-sky-200 bg-sky-50 px-5 py-4">
            <p className="mb-1 font-body text-[0.6rem] font-bold tracking-[0.18em] uppercase text-sky-400">הודעת היום</p>
            <p className="font-body text-base leading-relaxed text-charcoal/80">{dailyMessage}</p>
          </div>
        ) : (
          <p className="font-body text-sm text-charcoal/30">{isIn ? "עבודה טובה! 💪" : "שיהיה לך יום נעים 👋"}</p>
        )}
        <button onClick={reset}
          className="mt-2 w-full border border-charcoal/20 py-4 font-body text-sm font-semibold tracking-wider uppercase text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200">
          דיווח נוסף
        </button>
      </Screen>
    );
  }

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

  if (step === "submitting") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <Loader2 size={48} strokeWidth={1.5} className="text-accent animate-spin" />
        <p className="font-body text-sm text-charcoal/50 tracking-wider">שולח דיווח…</p>
      </Screen>
    );
  }

  if (step === "locating") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <MapPin size={48} strokeWidth={1.5} className="text-accent animate-pulse" />
        <p className="font-body text-sm text-charcoal/50 tracking-wider">מאתר מיקום…</p>
      </Screen>
    );
  }

  if (step === "ready" && coords) {
    return (
      <Screen backHref={portalHref} backLabel={backLabel}>
        <div className="text-center space-y-1">
          <p className="font-body text-[0.6rem] font-bold tracking-[0.22em] uppercase text-accent/70">מיקום אושר ✓</p>
          <p className="font-body text-sm text-charcoal/50 dir-ltr tabular-nums">{phone}</p>
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

  // Phone entry (default) + admin button at the bottom
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

      {/* Admin entry — subtle link at the very bottom */}
      <button
        onClick={() => setAdminView("password")}
        className="mt-4 flex items-center gap-1.5 font-body text-[0.65rem] tracking-widest uppercase text-charcoal/20 hover:text-charcoal/50 transition-colors duration-200"
      >
        <Lock size={10} strokeWidth={1.5} />
        ניהול
      </button>
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
      {backHref && (
        <div className="absolute top-5 end-5">
          <Link href={backHref}
            className="flex items-center gap-1 font-body text-xs text-charcoal/35 hover:text-accent transition-colors duration-200">
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
