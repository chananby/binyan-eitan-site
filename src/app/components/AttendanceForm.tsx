"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFeedback } from "../hooks/useFeedback";
import SuccessFlash from "./SuccessFlash";
import {
  LogIn, LogOut, MapPin, CheckCircle, AlertCircle, Loader2,
  ChevronRight, Building2,
} from "lucide-react";
import { labelWithDayHe } from "../../lib/date-utils";
import { israelWallClockToISO } from "../../lib/israel-time";

// ── Types ──────────────────────────────────────────────────────────────────────
type Step = "phone" | "locating" | "project" | "ready" | "submitting" | "success" | "error" | "history" | "manual" | "manualSuccess";

interface GeoCoords { lat: number; lng: number; }
interface Project { id: string; name: string; status?: string; }

function nowLabel() {
  return new Date().toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Language support ───────────────────────────────────────────────────────────

type Lang = "he" | "ru";

const T: Record<Lang, {
  clockTitle: string; phonePrompt: string; confirmLocation: string; geoRequired: string;
  locating: string;
  pickSite: string; pickSiteSub: string; loadingSites: string; noSites: string; changeNumber: string;
  locationOk: string; clockIn: string; clockOut: string; changeSite: string;
  sending: string;
  recordedIn: string; recordedOut: string; hello: string;
  autoReg: string; autoRegBody: string; dayMsg: string;
  goodWorkIn: string; goodWorkOut: string; anotherReport: string;
  tryAgain: string; notFound: string; unknownError: string; accountInactive: string; alreadyClockedIn: string; noInternalAccess: string;
  home: string; footer: string;
  myHistory: string; historyTitle: string; noHistory: string; loadingHistory: string; backToForm: string;
  manualBtn: string; manualTitle: string; manualSentTitle: string; manualSentBody: string; pendingBadge: string;
}> = {
  he: {
    clockTitle: "שעון נוכחות",
    phonePrompt: "הזן מספר טלפון לזיהוי",
    confirmLocation: "אשר מיקום והמשך",
    geoRequired: "חובה לאשר מיקום כדי לדווח נוכחות. אפשר גישה ל-GPS בהגדרות הדפדפן ונסה שוב, או השתמש ב\"דיווח חסר\" לאחר מכן.",
    locating: "מאתר מיקום…",
    pickSite: "בחר אתר בנייה",
    pickSiteSub: "בחר את האתר שבו אתה עובד היום",
    loadingSites: "טוען אתרים...",
    noSites: "אין אתרי בנייה פעילים — פנה למנהל",
    changeNumber: "שנה מספר",
    locationOk: "מיקום אושר ✓",
    clockIn: "כניסה",
    clockOut: "יציאה",
    changeSite: "שנה אתר",
    sending: "שולח דיווח…",
    recordedIn: "כניסה נרשמה ✅",
    recordedOut: "יציאה נרשמה 🔴",
    hello: "שלום",
    autoReg: "רישום אוטומטי",
    autoRegBody: "הטלפון נרשם כמשתמש ראשון במערכת. עדכן את שמך בדשבורד הניהולי.",
    dayMsg: "הודעת היום",
    goodWorkIn: "עבודה טובה! 💪",
    goodWorkOut: "שיהיה לך יום נעים 👋",
    anotherReport: "דיווח נוסף",
    tryAgain: "נסה שוב",
    notFound: "מספר הטלפון לא נמצא ברשימת הצוות. פנה למנהל.",
    unknownError: "שגיאה לא ידועה — נסה שוב.",
    accountInactive: "החשבון שלך אינו פעיל. פנה למנהל.",
    alreadyClockedIn: "כניסה כבר נרשמה היום. אם יש שגיאה — פנה למנהל.",
    noInternalAccess: "להצגת היסטוריה יש להיכנס דרך פורטל העובדים תחילה.",
    home: "דף הבית",
    footer: "בניין איתן — מערכת נוכחות פנימית",
    myHistory: "היסטוריית נוכחות שלי",
    historyTitle: "הנוכחות שלי",
    noHistory: "לא נמצאו רשומות נוכחות",
    loadingHistory: "טוען היסטוריה...",
    backToForm: "חזור לדיווח",
    manualBtn: "דיווח חסר",
    manualTitle: "הוספת דיווח ידני",
    manualSentTitle: "הדיווח נשלח ✓",
    manualSentBody: "המנהל יאשר את הדיווח בקרוב",
    pendingBadge: "ממתין לאישור",
  },
  ru: {
    clockTitle: "Отметка о явке",
    phonePrompt: "Введите номер телефона",
    confirmLocation: "Подтвердить местоположение",
    geoRequired: "Необходимо разрешить доступ к местоположению. Разрешите GPS в настройках браузера и попробуйте снова, или используйте «Пропущенная отметка» позже.",
    locating: "Определение местоположения…",
    pickSite: "Выберите объект",
    pickSiteSub: "Выберите объект, где вы работаете сегодня",
    loadingSites: "Загрузка объектов...",
    noSites: "Нет активных объектов — обратитесь к менеджеру",
    changeNumber: "Изменить номер",
    locationOk: "Местоположение подтверждено ✓",
    clockIn: "Приход",
    clockOut: "Уход",
    changeSite: "Изменить объект",
    sending: "Отправка данных…",
    recordedIn: "Приход зарегистрирован ✅",
    recordedOut: "Уход зарегистрирован 🔴",
    hello: "Привет,",
    autoReg: "Авторегистрация",
    autoRegBody: "Номер зарегистрирован как новый пользователь. Обновите имя в панели администратора.",
    dayMsg: "Сообщение дня",
    goodWorkIn: "Хорошей работы! 💪",
    goodWorkOut: "Хорошего дня! 👋",
    anotherReport: "Ещё одна отметка",
    tryAgain: "Повторить",
    notFound: "Номер телефона не найден в списке сотрудников. Обратитесь к менеджеру.",
    unknownError: "Неизвестная ошибка — попробуйте снова.",
    accountInactive: "Ваш аккаунт неактивен. Обратитесь к менеджеру.",
    alreadyClockedIn: "Приход уже отмечен сегодня. Если это ошибка — обратитесь к менеджеру.",
    noInternalAccess: "Для просмотра истории войдите сначала через портал сотрудников.",
    home: "Главная",
    footer: "Binyan Eitan — система учёта рабочего времени",
    myHistory: "Моя история посещаемости",
    historyTitle: "Моя посещаемость",
    noHistory: "Записи не найдены",
    loadingHistory: "Загрузка...",
    backToForm: "Вернуться к отметке",
    manualBtn: "Пропущенная отметка",
    manualTitle: "Добавить отметку вручную",
    manualSentTitle: "Отметка отправлена ✓",
    manualSentBody: "Менеджер скоро подтвердит её",
    pendingBadge: "Ожидает подтверждения",
  },
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function AttendanceForm({ siteLang = "he" }: { siteLang?: "he" | "en" }) {
  const portalHref = `/${siteLang}/internal`;
  const backLabel  = siteLang === "he" ? "חזור לתפריט הראשי" : "Back to Portal";

  // ── Worker attendance state ──────────────────────────────────────────────
  const [step, setStep]                     = useState<Step>("phone");
  const [phone, setPhone]                   = useState("");
  const [coords, setCoords]                 = useState<GeoCoords | null>(null);
  const [geoError, setGeoError]             = useState<string | null>(null);
  const [workerName, setWorkerName]         = useState<string | null>(null);
  const [action, setAction]                 = useState<"in" | "out" | null>(null);
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);
  const [timestamp, setTimestamp]           = useState("");
  const [dailyMessage, setDailyMessage]     = useState<string | null>(null);
  const [autoRegistered, setAutoRegistered] = useState(false);
  const [showFlash,  setShowFlash]  = useState(false);
  const [flashVariant, setFlashVariant] = useState<"in" | "out">("in");
  const feedback = useFeedback();

  // ── Worker history state ──────────────────────────────────────────────────
  const [historyRecords, setHistoryRecords] = useState<Array<{ id: string; action: string; timestamp_label: string | null; clock_at?: string | null; created_at: string; is_manual?: boolean; status?: string; project: { id: string; name: string } | null }>>([]);
  const [historyName, setHistoryName]       = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError]     = useState<string | null>(null);

  // ── Manual entry state (worker) ───────────────────────────────────────────
  const [manualAction, setManualAction]   = useState<"in" | "out">("in");
  const [manualDate, setManualDate]       = useState("");
  const [manualTime, setManualTime]       = useState("");
  const [manualProject, setManualProject] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError]     = useState<string | null>(null);

  // ── Project selection (worker flow) ─────────────────────────────────────
  const [projects, setProjects]                   = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading]     = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // ── UI language (worker-facing only) ─────────────────────────────────────
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "he";
    return (localStorage.getItem("att_lang") as Lang) ?? "he";
  });
  useEffect(() => { localStorage.setItem("att_lang", lang); }, [lang]);
  const t = T[lang];

  // ── Load worker-flow projects ─────────────────────────────────────────────
  useEffect(() => {
    if (step !== "project" && step !== "manual") return;
    setProjectsLoading(true);
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {}).finally(() => setProjectsLoading(false));
  }, [step]);

  // ── Worker attendance callbacks ───────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!phone.trim() || phone.replace(/\D/g, "").length < 9) return;
    setGeoError(null); setStep("locating");
    if (!navigator.geolocation) {
      feedback.error();
      setGeoError(T[lang].geoRequired);
      setStep("phone"); return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStep("project"); },
      () => {
        feedback.error();
        setGeoError(T[lang].geoRequired);
        setStep("phone");
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  }, [phone, feedback]);

  const submit = useCallback(async (selectedAction: "in" | "out") => {
    if (!coords) return;
    setAction(selectedAction); setStep("submitting");
    const ts = nowLabel(); setTimestamp(ts);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          action: selectedAction === "in" ? "כניסה" : "יציאה",
          lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6), timestamp: ts,
          ...(selectedProjectId && { project_id: selectedProjectId }),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWorkerName(data.name ?? null); setDailyMessage(data.message ?? null);
        setAutoRegistered(data.auto_registered ?? false);
        setFlashVariant(selectedAction === "in" ? "in" : "out");
        setShowFlash(true);
        feedback.success();
        setStep("success");
      } else if (data.error === "phone_not_found") {
        feedback.error();
        setErrorMsg(T[lang].notFound); setStep("error");
      } else if (data.error === "account_inactive") {
        feedback.error();
        setErrorMsg(T[lang].accountInactive); setStep("error");
      } else if (data.error === "already_clocked_in") {
        feedback.error();
        setErrorMsg(T[lang].alreadyClockedIn); setStep("error");
      } else {
        feedback.error();
        setErrorMsg(data.error ?? T[lang].unknownError); setStep("error");
      }
    } catch { feedback.error(); setErrorMsg(T[lang].unknownError); setStep("error"); }
  }, [coords, phone, selectedProjectId]);

  const reset = () => {
    setStep("phone"); setPhone(""); setCoords(null); setGeoError(null);
    setWorkerName(null); setAction(null); setErrorMsg(null);
    setDailyMessage(null); setAutoRegistered(false); setSelectedProjectId("");
  };

  const fetchHistory = useCallback(async () => {
    if (phone.replace(/\D/g, "").length < 9) return;
    setHistoryLoading(true); setHistoryError(null); setHistoryRecords([]); setHistoryName(null);
    setStep("history");
    try {
      const res  = await fetch("/api/worker/history", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setHistoryName(data.name ?? null); setHistoryRecords(data.records ?? []); }
      else if (res.status === 401) { setHistoryError(T[lang].noInternalAccess); }
      else if (data.error === "phone_not_found") { setHistoryError(T[lang].notFound); }
      else { setHistoryError(T[lang].unknownError); }
    } catch { setHistoryError(T[lang].unknownError); }
    finally { setHistoryLoading(false); }
  }, [phone, lang]);

  const submitManual = useCallback(async () => {
    if (!manualDate || !manualTime) { setManualError("יש למלא תאריך ושעה"); return; }
    setManualLoading(true); setManualError(null);
    try {
      const res = await fetch("/api/worker/manual-entry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone:      phone.trim(),
          action:     manualAction,
          date:       manualDate,
          time:       manualTime,
          ...(manualProject && { project_id: manualProject }),
        }),
      });
      const data = await res.json();
      if (data.success) { setStep("manualSuccess"); }
      else if (res.status === 401) { setManualError(T[lang].noInternalAccess); }
      else { setManualError(data.error ?? T[lang].unknownError); }
    } catch { setManualError("שגיאת רשת — נסה שוב"); }
    finally { setManualLoading(false); }
  }, [phone, manualAction, manualDate, manualTime, manualProject]);

  // ── Worker attendance screens ─────────────────────────────────────────────

  if (step === "success") {
    const isIn = action === "in";
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    return (
      <>
      <SuccessFlash show={showFlash} onDone={() => setShowFlash(false)} variant={flashVariant} />
      <Screen backHref={portalHref} backLabel={backLabel} lang={lang} onLangChange={setLang}>
        <CheckCircle size={64} strokeWidth={1} className={isIn ? "text-green-500" : "text-red-400"} />
        <div className="text-center space-y-1">
          <p className="font-heading text-2xl font-bold text-charcoal">{isIn ? t.recordedIn : t.recordedOut}</p>
          {workerName && <p className="font-heading text-xl text-charcoal/80">{t.hello} {workerName}</p>}
          <p className="font-body text-sm text-charcoal/40">{timestamp}</p>
          {selectedProject && (
            <div className="flex items-center justify-center gap-1 text-sm text-charcoal/50 mt-1">
              <Building2 size={14} strokeWidth={1.5} /><span>{selectedProject.name}</span>
            </div>
          )}
        </div>
        {autoRegistered && (
          <div className="w-full rounded-sm border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="mb-1 font-body text-[0.6rem] font-bold tracking-[0.18em] uppercase text-amber-500">{t.autoReg}</p>
            <p className="font-body text-sm leading-relaxed text-charcoal/80">{t.autoRegBody}</p>
          </div>
        )}
        {dailyMessage ? (
          <div className="w-full rounded-sm border border-sky-200 bg-sky-50 px-5 py-4">
            <p className="mb-1 font-body text-[0.6rem] font-bold tracking-[0.18em] uppercase text-sky-400">{t.dayMsg}</p>
            <p className="font-body text-base leading-relaxed text-charcoal/80">{dailyMessage}</p>
          </div>
        ) : (
          <p className="font-body text-sm text-charcoal/30">{isIn ? t.goodWorkIn : t.goodWorkOut}</p>
        )}
        <button onClick={reset}
          className="mt-2 w-full border border-charcoal/20 py-4 font-body text-sm font-semibold tracking-wider uppercase text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200">
          {t.anotherReport}
        </button>
      </Screen>
      </>
    );
  }

  if (step === "error") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel} lang={lang} onLangChange={setLang}>
        <AlertCircle size={56} strokeWidth={1} className="text-red-400" />
        <p className="font-body text-center text-sm text-charcoal/70 leading-relaxed max-w-xs">{errorMsg}</p>
        <button onClick={reset}
          className="mt-4 w-full bg-charcoal py-4 font-body text-sm font-semibold tracking-wider uppercase text-bone hover:bg-charcoal/80 transition-colors duration-200">
          {t.tryAgain}
        </button>
      </Screen>
    );
  }

  if (step === "submitting") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel} lang={lang} onLangChange={setLang}>
        <Loader2 size={48} strokeWidth={1.5} className="text-accent animate-spin" />
        <p className="font-body text-sm text-charcoal/50 tracking-wider">{t.sending}</p>
      </Screen>
    );
  }

  if (step === "locating") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel} lang={lang} onLangChange={setLang}>
        <MapPin size={48} strokeWidth={1.5} className="text-accent animate-pulse" />
        <p className="font-body text-sm text-charcoal/50 tracking-wider">{t.locating}</p>
      </Screen>
    );
  }

  if (step === "project") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel} lang={lang} onLangChange={setLang}>
        <div className="text-center space-y-1">
          <Building2 size={36} strokeWidth={1.5} className="text-accent mx-auto" />
          <p className="font-heading text-xl font-bold text-charcoal">{t.pickSite}</p>
          <p className="font-body text-xs text-charcoal/40">{t.pickSiteSub}</p>
        </div>
        <div className="w-full space-y-3">
          {projectsLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-charcoal/40">
              <Loader2 size={18} className="animate-spin" />
              <span className="font-body text-sm">{t.loadingSites}</span>
            </div>
          ) : projects.length === 0 ? (
            <p className="text-center font-body text-sm text-charcoal/40 py-4">{t.noSites}</p>
          ) : (
            <div className="space-y-2">
              {projects.map(p => (
                <button key={p.id} onClick={() => { setSelectedProjectId(p.id); setStep("ready"); }}
                  className={`w-full flex items-center gap-3 px-5 py-4 border transition-all duration-150 text-right ${selectedProjectId === p.id ? "border-accent bg-accent/5 text-accent" : "border-charcoal/15 bg-white hover:border-accent/50 text-charcoal"}`}>
                  <Building2 size={18} strokeWidth={1.5} className="shrink-0" />
                  <p className="font-heading text-sm font-semibold truncate flex-1">{p.name}</p>
                </button>
              ))}
            </div>
          )}
          <button onClick={reset}
            className="font-body text-xs text-charcoal/30 hover:text-charcoal/60 transition-colors duration-200 underline underline-offset-2 w-full text-center">
            {t.changeNumber}
          </button>
        </div>
      </Screen>
    );
  }

  if (step === "ready" && coords) {
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    return (
      <Screen backHref={portalHref} backLabel={backLabel} lang={lang} onLangChange={setLang}>
        <div className="text-center space-y-1">
          <p className="font-body text-[0.6rem] font-bold tracking-[0.22em] uppercase text-accent/70">{t.locationOk}</p>
          <p className="font-body text-sm text-charcoal/50 tabular-nums" dir="ltr">{phone}</p>
          {selectedProject && (
            <div className="flex items-center justify-center gap-1 text-xs text-charcoal/50">
              <Building2 size={12} strokeWidth={1.5} /><span>{selectedProject.name}</span>
            </div>
          )}
        </div>
        <div className="w-full grid grid-cols-2 gap-4">
          <button onClick={() => submit("in")}
            className="flex flex-col items-center justify-center gap-3 bg-green-600 hover:bg-green-700 active:scale-95 py-8 transition-all duration-150 rounded-sm">
            <LogIn size={32} strokeWidth={1.5} className="text-white" />
            <span className="font-heading text-lg font-bold text-white">{t.clockIn}</span>
          </button>
          <button onClick={() => submit("out")}
            className="flex flex-col items-center justify-center gap-3 bg-red-500 hover:bg-red-600 active:scale-95 py-8 transition-all duration-150 rounded-sm">
            <LogOut size={32} strokeWidth={1.5} className="text-white" />
            <span className="font-heading text-lg font-bold text-white">{t.clockOut}</span>
          </button>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={() => setStep("project")} className="font-body text-xs text-charcoal/30 hover:text-charcoal/60 transition-colors duration-200 underline underline-offset-2">{t.changeSite}</button>
          <button onClick={reset} className="font-body text-xs text-charcoal/20 hover:text-charcoal/50 transition-colors duration-200">{t.changeNumber}</button>
        </div>
      </Screen>
    );
  }

  // ── History screen ────────────────────────────────────────────────────────
  if (step === "history") {
    // Parse "DD.MM.YYYY, HH:MM" or "DD.MM.YYYY HH:MM" → Date
    function parseLabel(label: string | null | undefined): Date | null {
      if (!label) return null;
      const parts = label.replace(",", "").trim().split(/\s+/);
      if (parts.length < 2) return null;
      const [datePart, timePart] = parts;
      const [d, m, y] = datePart.split(".");
      const [h, min]  = timePart.split(":");
      if (!d || !m || !y || !h || !min) return null;
      // DST-aware Israel-local-time → UTC conversion.
      try {
        const ymd = `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
        const hm  = `${h.padStart(2,"0")}:${min.padStart(2,"0")}`;
        const dt = new Date(israelWallClockToISO(ymd, hm));
        return isNaN(dt.getTime()) ? null : dt;
      } catch { return null; }
    }
    function labelTime(label: string | null | undefined): string {
      const dt = parseLabel(label);
      if (!dt) return "";
      return dt.toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
    }
    function labelDateKey(label: string | null | undefined, fallback: string): string {
      const dt = parseLabel(label) ?? new Date(fallback);
      return dt.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric" });
    }
    type HR = typeof historyRecords[0];
    function clockDt(r: HR): Date {
      return r.clock_at ? new Date(r.clock_at) : (parseLabel(r.timestamp_label) ?? new Date(r.created_at));
    }
    function clockTime(r: HR | null | undefined): string {
      if (!r) return "";
      if (r.clock_at) return new Date(r.clock_at).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
      return labelTime(r.timestamp_label);
    }

    const pendingEntries = historyRecords.filter(r => r.status === "pending");

    const HE_DAYS_LOCAL = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;
    function dayNameFromDt(dt: Date | null): string {
      return dt ? `יום ${HE_DAYS_LOCAL[dt.getDay()]}` : "";
    }

    // Group records by day, compute hours per day (exclude pending)
    type DayRow = { date: string; dayName: string; project: string; entry: string; exit: string; hours: number | null };
    const dayRows: DayRow[] = (() => {
      const sorted = [...historyRecords].filter(r => r.status !== "pending").sort((a, b) =>
        clockDt(a).getTime() - clockDt(b).getTime()
      );
      const byDate = new Map<string, { entries: typeof sorted; exits: typeof sorted; project: string }>();
      for (const r of sorted) {
        const key = clockDt(r).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric" });
        if (!byDate.has(key)) byDate.set(key, { entries: [], exits: [], project: r.project?.name ?? "—" });
        const day = byDate.get(key)!;
        if (r.action === "כניסה" || r.action === "in") day.entries.push(r);
        else day.exits.push(r);
        if (r.project?.name) day.project = r.project.name;
      }
      return [...byDate.entries()].map(([date, day]) => {
        const first = day.entries[0] ?? null;
        const last  = day.exits[day.exits.length - 1] ?? null;
        let hours: number | null = null;
        if (first && last) {
          const diff = clockDt(last).getTime() - clockDt(first).getTime();
          if (diff > 0) hours = Math.round(diff / 36_000) / 100;
        }
        const dayDt = first ? clockDt(first) : (last ? clockDt(last) : null);
        return { date, dayName: dayNameFromDt(dayDt), project: day.project, entry: clockTime(first), exit: clockTime(last), hours };
      }).reverse();
    })();

    const totalHours = dayRows.reduce((s, r) => s + (r.hours ?? 0), 0);

    return (
      <Screen backHref={portalHref} backLabel={backLabel} lang={lang} onLangChange={setLang}>
        <div className="w-full text-center space-y-1">
          <p className="font-body text-[0.6rem] font-bold tracking-[0.22em] uppercase text-accent/70">{t.historyTitle}</p>
          {historyName && <p className="font-heading text-lg font-bold text-charcoal">{historyName}</p>}
        </div>
        <div className="w-full space-y-2">
          {historyLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-charcoal/40">
              <Loader2 size={18} className="animate-spin" />
              <span className="font-body text-sm">{t.loadingHistory}</span>
            </div>
          ) : historyError ? (
            <p className="text-center font-body text-sm text-red-400 py-4">{historyError}</p>
          ) : dayRows.length === 0 && pendingEntries.length === 0 ? (
            <p className="text-center font-body text-sm text-charcoal/40 py-4">{t.noHistory}</p>
          ) : (
            <div className="w-full space-y-1">
              {/* Header */}
              <div className="grid grid-cols-4 gap-1 px-2 py-1.5 text-[0.58rem] font-semibold text-charcoal/40 uppercase tracking-wide border-b border-charcoal/8">
                <span>תאריך</span>
                <span className="text-center">כניסה</span>
                <span className="text-center">יציאה</span>
                <span className="text-end">שעות</span>
              </div>
              <div className="divide-y divide-charcoal/8 max-h-[48vh] overflow-y-auto">
                {dayRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-4 gap-1 px-2 py-3 items-center">
                    <div>
                      {row.dayName && <p className="font-body text-[0.58rem] font-semibold text-accent/70">{row.dayName}</p>}
                      <p className="font-body text-xs text-charcoal/70 tabular-nums" dir="ltr">{row.date}</p>
                      {row.project !== "—" && <p className="font-body text-[0.58rem] text-charcoal/35 truncate">{row.project}</p>}
                    </div>
                    <span className="font-body text-xs font-semibold text-green-700 text-center tabular-nums">{row.entry || "—"}</span>
                    <span className="font-body text-xs font-semibold text-red-500 text-center tabular-nums">{row.exit || "—"}</span>
                    <span className="font-body text-sm font-bold text-charcoal text-end tabular-nums">
                      {row.hours !== null ? row.hours.toFixed(1) : "—"}
                    </span>
                  </div>
                ))}
              </div>
              {/* Total */}
              <div className="flex items-center justify-between bg-charcoal px-3 py-2.5 mt-1">
                <span className="font-body text-xs font-semibold text-white/60">סה&quot;כ</span>
                <span className="font-heading text-base font-bold text-accent tabular-nums">{totalHours.toFixed(1)} שעות</span>
              </div>
            </div>
          )}
        </div>
        {/* Pending manual entries */}
        {pendingEntries.length > 0 && (
          <div className="w-full space-y-1">
            <p className="font-body text-[0.6rem] font-bold tracking-[0.2em] uppercase text-amber-500 px-1">{t.pendingBadge}</p>
            <div className="border border-amber-200 bg-amber-50 divide-y divide-amber-100">
              {pendingEntries.map(r => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 gap-3">
                  <span className={`text-xs font-semibold ${r.action === "in" ? "text-green-700" : "text-red-500"}`}>
                    {r.action === "in" ? "כניסה" : "יציאה"}
                  </span>
                  <span className="font-body text-xs text-charcoal/60 flex-1" dir="rtl">{labelWithDayHe(r.timestamp_label) ?? "—"}</span>
                  <span className="font-body text-[0.6rem] text-amber-600 bg-amber-100 px-1.5 py-0.5">{t.pendingBadge}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => { setManualDate(new Date().toISOString().slice(0, 10)); setManualTime(""); setManualProject(""); setManualError(null); setStep("manual"); }}
          className="w-full border border-accent/40 py-3 font-body text-sm font-semibold tracking-wider text-accent hover:bg-accent/5 transition-colors duration-200">
          + {t.manualBtn}
        </button>
        <button onClick={reset}
          className="w-full border border-charcoal/20 py-4 font-body text-sm font-semibold tracking-wider uppercase text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200">
          {t.backToForm}
        </button>
      </Screen>
    );
  }

  if (step === "manual") {
    const todayIso = new Date().toISOString().slice(0, 10);
    return (
      <Screen backHref={portalHref} backLabel={backLabel} lang={lang} onLangChange={setLang}>
        <div className="text-center space-y-1">
          <p className="font-heading text-xl font-bold text-charcoal">{t.manualTitle}</p>
          <p className="font-body text-xs text-charcoal/40">הדיווח ישלח לאישור המנהל</p>
        </div>

        {/* כניסה / יציאה toggle */}
        <div className="w-full grid grid-cols-2 gap-3">
          <button onClick={() => setManualAction("in")}
            className={`py-4 font-body text-sm font-semibold tracking-wider border transition-all duration-150 ${manualAction === "in" ? "bg-charcoal text-bone border-charcoal" : "border-charcoal/20 text-charcoal/50 hover:border-accent"}`}>
            {t.clockIn}
          </button>
          <button onClick={() => setManualAction("out")}
            className={`py-4 font-body text-sm font-semibold tracking-wider border transition-all duration-150 ${manualAction === "out" ? "bg-charcoal text-bone border-charcoal" : "border-charcoal/20 text-charcoal/50 hover:border-accent"}`}>
            {t.clockOut}
          </button>
        </div>

        {/* Date + Time */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="font-body text-[0.65rem] text-charcoal/50 font-semibold tracking-wide uppercase">תאריך</p>
            <input type="date" value={manualDate} max={todayIso} onChange={e => setManualDate(e.target.value)}
              className="w-full border border-charcoal/20 bg-white px-3 py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors" dir="ltr" />
          </div>
          <div className="space-y-1">
            <p className="font-body text-[0.65rem] text-charcoal/50 font-semibold tracking-wide uppercase">שעה</p>
            <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)}
              className="w-full border border-charcoal/20 bg-white px-3 py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors" dir="ltr" />
          </div>
        </div>

        {/* Project (optional) */}
        {projects.length > 0 && (
          <div className="w-full space-y-1">
            <p className="font-body text-[0.65rem] text-charcoal/50 font-semibold tracking-wide uppercase">אתר (אופציונלי)</p>
            <select value={manualProject} onChange={e => setManualProject(e.target.value)}
              className="w-full border border-charcoal/20 bg-white px-3 py-3 font-body text-sm text-charcoal focus:border-accent focus:outline-none transition-colors">
              <option value="">— ללא אתר —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {manualError && <p className="font-body text-sm text-red-500 text-center">{manualError}</p>}

        <button onClick={submitManual} disabled={manualLoading}
          className="w-full bg-accent py-4 font-body text-sm font-semibold tracking-wider uppercase text-bone hover:bg-accent-dark disabled:opacity-40 transition-colors duration-200">
          {manualLoading ? "שולח…" : "שלח לאישור"}
        </button>
        <button onClick={() => setStep("history")}
          className="w-full border border-charcoal/20 py-3 font-body text-sm text-charcoal/40 hover:text-accent hover:border-accent transition-colors duration-200">
          חזור להיסטוריה
        </button>
      </Screen>
    );
  }

  if (step === "manualSuccess") {
    return (
      <Screen backHref={portalHref} backLabel={backLabel} lang={lang} onLangChange={setLang}>
        <CheckCircle size={64} strokeWidth={1} className="text-amber-400" />
        <div className="text-center space-y-2">
          <p className="font-heading text-2xl font-bold text-charcoal">{t.manualSentTitle}</p>
          <p className="font-body text-sm text-charcoal/50">{t.manualSentBody}</p>
        </div>
        <button onClick={fetchHistory}
          className="w-full border border-charcoal/20 py-4 font-body text-sm font-semibold tracking-wider uppercase text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200">
          {t.myHistory}
        </button>
        <button onClick={reset}
          className="font-body text-xs text-charcoal/30 hover:text-accent transition-colors">
          {t.backToForm}
        </button>
      </Screen>
    );
  }

  // Default: phone entry
  return (
    <Screen backHref={portalHref} backLabel={backLabel} lang={lang} onLangChange={setLang}>
      <div className="text-center space-y-1">
        <p className="font-heading text-xl font-bold text-charcoal">{t.clockTitle}</p>
        <p className="font-body text-xs text-charcoal/40">{t.phonePrompt}</p>
      </div>
      <div className="w-full space-y-4">
        <input
          type="tel" inputMode="numeric" value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && requestLocation()}
          placeholder="05X-XXX-XXXX"
          className="w-full border border-charcoal/20 bg-white px-5 py-5 text-center font-body text-xl tracking-widest text-charcoal placeholder-charcoal/20 focus:border-accent focus:outline-none transition-colors duration-200"
          autoComplete="tel" dir="ltr"
        />
        {geoError && (
          <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
            <p className="font-body text-xs text-red-600 leading-snug">{geoError}</p>
          </div>
        )}
        <button onClick={requestLocation} disabled={phone.replace(/\D/g, "").length < 9}
          className="w-full bg-accent py-5 font-heading text-base font-bold tracking-[0.15em] uppercase text-bone transition-colors duration-200 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2">
          <MapPin size={18} strokeWidth={1.5} />
          {t.confirmLocation}
        </button>
        <button onClick={fetchHistory} disabled={phone.replace(/\D/g, "").length < 9}
          className="w-full border border-charcoal/15 py-3 font-body text-sm text-charcoal/50 hover:border-accent hover:text-accent transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed">
          {t.myHistory}
        </button>
      </div>
    </Screen>
  );
}

// ── Screen helper ─────────────────────────────────────────────────────────────

function Screen({ children, backHref, backLabel, lang, onLangChange }: {
  children: React.ReactNode; backHref?: string; backLabel?: string;
  lang: Lang; onLangChange: (l: Lang) => void;
}) {
  const isRtl = lang === "he";
  return (
    <div className="relative min-h-screen bg-bone flex flex-col items-center justify-center px-6 py-16 gap-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="absolute top-5 start-5">
        <Link href="/he"
          className="flex items-center gap-1 font-body text-xs text-charcoal/30 hover:text-accent transition-colors duration-200">
          <ChevronRight size={14} strokeWidth={1.5} className={isRtl ? "rotate-180" : ""} />
          <span>{T[lang].home}</span>
        </Link>
      </div>
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
      <div className="flex items-center gap-2 mt-2">
        <button onClick={() => onLangChange("he")}
          className={`font-body text-xs transition-colors duration-150 ${lang === "he" ? "text-accent font-bold" : "text-charcoal/25 hover:text-charcoal/50"}`}>
          עב
        </button>
        <span className="text-charcoal/15 text-xs">|</span>
        <button onClick={() => onLangChange("ru")}
          className={`font-body text-xs transition-colors duration-150 ${lang === "ru" ? "text-accent font-bold" : "text-charcoal/25 hover:text-charcoal/50"}`}>
          RU
        </button>
      </div>
      <p className="font-body text-[0.55rem] tracking-widest uppercase text-charcoal/20">
        {T[lang].footer}
      </p>
    </div>
  );
}
