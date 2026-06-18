"use client";

// AttendanceForm — the worker-facing clock-in/out flow.
//
// This file is the *state owner and dispatcher*. Every per-screen view
// (phone, menu, locating, project, ready, history, manual, success,
// error, …) lives under ./attendance/ as a pure-presentation component
// that receives data and callbacks via props. All fetch calls — identify,
// attendance POST, history, manual-entry — live here too so the screens
// have no network side-effects. The translations and the shared Screen
// wrapper are likewise extracted under ./attendance/.

import { useState, useCallback, useEffect, useMemo } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { T, detectInitialLang, SUPPORTED_LANGS, type Lang } from "./attendance/i18n";
import { countMissingExitDays } from "../../lib/worker-missing-exits";
import type { Step, GeoCoords, Project, HistoryRecord, CorrectionSummary } from "./attendance/types";
import PhoneScreen from "./attendance/PhoneScreen";
import MenuScreen from "./attendance/MenuScreen";
import ProjectScreen from "./attendance/ProjectScreen";
import ReadyScreen from "./attendance/ReadyScreen";
import HistoryScreen from "./attendance/HistoryScreen";
import ManualScreen from "./attendance/ManualScreen";
import {
  SubmittingScreen, LocatingScreen, ErrorScreen, SuccessScreen, ManualSuccessScreen,
} from "./attendance/StatusScreens";

function nowLabel() {
  return new Date().toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AttendanceForm({ siteLang = "he" }: { siteLang?: "he" | "en" }) {
  const portalHref = `/${siteLang}/internal`;

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

  // ── Identity state ────────────────────────────────────────────────────────
  // Identity now lives in a signed httpOnly cookie issued by /api/worker/identify.
  // Mount probes for an existing session; phone-input becomes "identify" rather
  // than a clock-in trigger. Until the probe finishes we hide the form to avoid
  // a phone-input flash for already-authed workers.
  const [identifiedStaffId, setIdentifiedStaffId] = useState<string | null>(null);
  const [identifyCheckDone, setIdentifyCheckDone] = useState(false);
  const [identifying,       setIdentifying]       = useState(false);
  const [identifyError,     setIdentifyError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/worker/identify", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok) {
          setIdentifiedStaffId(d.staff_id);
          setWorkerName(d.name);
          setStep("menu");
        }
      })
      .catch(() => { /* no session — stay on phone */ })
      .finally(() => setIdentifyCheckDone(true));
  }, []);

  // ── Worker history state ──────────────────────────────────────────────────
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [historyName, setHistoryName]       = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError]     = useState<string | null>(null);
  // Map: attendance_id → most recent correction status. Drives whether the
  // history row shows a ⚠️ "report" button or a ⏳ "request sent" chip.
  const [corrections, setCorrections]       = useState<Record<string, CorrectionSummary>>({});
  // Which record is currently being reported (inline form open). Null = no
  // form open. Only one row in form mode at a time.
  const [reportingId, setReportingId]       = useState<string | null>(null);

  // Past days with a clock-in but no clock-out, inside the correctable retro
  // window — drives the "you forgot to clock out" banner on the menu. Derived
  // purely from the already-fetched history records; no extra endpoint.
  const missingExitCount = useMemo(() => countMissingExitDays(historyRecords), [historyRecords]);

  // Silently pull history when the worker lands on the menu so the missing
  // clock-out banner can appear without them opening the history screen.
  // Errors are swallowed — on failure the banner simply stays hidden.
  useEffect(() => {
    if (step !== "menu" || !identifiedStaffId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/worker/history", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setHistoryRecords(data.records ?? []);
        setCorrections(data.corrections ?? {});
        if (data.name) setHistoryName(data.name);
      } catch { /* offline / transient — banner stays hidden */ }
    })();
    return () => { cancelled = true; };
  }, [step, identifiedStaffId]);

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
  // Initial pick honours an existing localStorage choice first (a worker
  // who already picked Russian last month stays in Russian); otherwise we
  // sniff navigator.language so a first-time Sinhala speaker isn't stuck
  // on Hebrew until they find the picker. SSR falls back to "he".
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "he";
    const stored = localStorage.getItem("att_lang");
    if (stored && (SUPPORTED_LANGS as string[]).includes(stored)) return stored as Lang;
    return detectInitialLang(navigator.language);
  });
  useEffect(() => { localStorage.setItem("att_lang", lang); }, [lang]);
  const t = T[lang];
  const backLabel = t.backToPortal;

  // ── Load worker-flow projects ─────────────────────────────────────────────
  useEffect(() => {
    if (step !== "project" && step !== "manual") return;
    setProjectsLoading(true);
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {}).finally(() => setProjectsLoading(false));
  }, [step]);

  // ── Identity callbacks ───────────────────────────────────────────────────
  // Submit the typed phone to /api/worker/identify; on success the cookie is
  // set server-side, name is shown, and we land on the action menu.
  const identify = useCallback(async () => {
    if (phone.replace(/\D/g, "").length < 9) return;
    setIdentifying(true); setIdentifyError(null);
    try {
      const res = await fetch("/api/worker/identify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok) {
        setIdentifiedStaffId(d.staff_id);
        setWorkerName(d.name);
        setPhone("");
        setStep("menu");
        feedback.success();
      } else if (res.status === 404) {
        feedback.error(); setIdentifyError(T[lang].notFound);
      } else if (res.status === 429) {
        feedback.error(); setIdentifyError(T[lang].tooManyAttempts);
      } else if (res.status === 401) {
        // 401 here means the be_internal_token (PIN) cookie expired or was
        // wiped while sessionStorage still claimed authed. Show a message
        // that matches what actually happened, drop the stale flag, then
        // reload — PinGate's mount probe will see no flag and render the
        // PIN keypad, letting the worker re-auth without manual recovery.
        feedback.error(); setIdentifyError(T[lang].pinExpired);
        try { sessionStorage.removeItem("be_internal_auth"); } catch { /* private mode */ }
        setTimeout(() => { window.location.reload(); }, 1500);
      } else {
        feedback.error(); setIdentifyError(d?.error ?? T[lang].unknownError);
      }
    } catch {
      feedback.error(); setIdentifyError(T[lang].unknownError);
    } finally {
      setIdentifying(false);
    }
  }, [phone, lang, feedback]);

  // "Change user" — DELETE clears the worker cookie, then reset UI to phone.
  // Reset() also routes here when the server tells us our session expired
  // (401 from any worker endpoint).
  const switchUser = useCallback(async () => {
    try { await fetch("/api/worker/identify", { method: "DELETE" }); } catch { /* best effort */ }
    setIdentifiedStaffId(null);
    setWorkerName(null);
    setPhone("");
    setCoords(null);
    setSelectedProjectId("");
    setHistoryRecords([]); setHistoryName(null);
    setIdentifyError(null);
    setStep("phone");
  }, []);

  // ── Worker attendance callbacks ───────────────────────────────────────────
  // Triggered from the menu after identify. No phone check here — identity
  // is already established at the cookie level.
  const requestLocation = useCallback(() => {
    if (!identifiedStaffId) { setStep("phone"); return; }
    setGeoError(null); setStep("locating");
    if (!navigator.geolocation) {
      feedback.error();
      setGeoError(T[lang].geoRequired);
      setStep("menu"); return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStep("project"); },
      () => {
        feedback.error();
        setGeoError(T[lang].geoRequired);
        setStep("menu");
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  }, [identifiedStaffId, lang, feedback]);

  const submit = useCallback(async (selectedAction: "in" | "out") => {
    if (!coords) return;
    setAction(selectedAction); setStep("submitting");
    const ts = nowLabel(); setTimestamp(ts);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction === "in" ? "כניסה" : "יציאה",
          lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6), timestamp: ts,
          ...(selectedProjectId && { project_id: selectedProjectId }),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWorkerName(data.name ?? workerName); setDailyMessage(data.message ?? null);
        setFlashVariant(selectedAction === "in" ? "in" : "out");
        setShowFlash(true);
        feedback.success();
        setStep("success");
      } else if (res.status === 401) {
        // Cookie expired / revoked — drop back to phone entry with a hint.
        feedback.error();
        setErrorMsg(T[lang].sessionExpired); setStep("error");
        setIdentifiedStaffId(null);
      } else if (data.error === "account_inactive") {
        feedback.error();
        setErrorMsg(T[lang].accountInactive); setStep("error");
      } else if (data.error === "already_clocked_in") {
        feedback.error();
        setErrorMsg(T[lang].alreadyClockedIn); setStep("error");
      } else if (res.status === 429) {
        feedback.error();
        setErrorMsg(T[lang].tooManyAttempts); setStep("error");
      } else {
        feedback.error();
        setErrorMsg(data.error ?? T[lang].unknownError); setStep("error");
      }
    } catch { feedback.error(); setErrorMsg(T[lang].unknownError); setStep("error"); }
  }, [coords, workerName, selectedProjectId, lang, feedback]);

  // reset() returns to the action menu after a single clock-in/out cycle.
  // It does NOT clear identity — the worker stays logged in.
  // For "change user", use switchUser() which also clears the cookie.
  const reset = () => {
    setStep(identifiedStaffId ? "menu" : "phone");
    setCoords(null); setGeoError(null);
    setAction(null); setErrorMsg(null);
    setDailyMessage(null); setAutoRegistered(false); setSelectedProjectId("");
  };

  const fetchHistory = useCallback(async () => {
    if (!identifiedStaffId) { setStep("phone"); return; }
    setHistoryLoading(true); setHistoryError(null); setHistoryRecords([]); setHistoryName(null);
    setStep("history");
    try {
      const res  = await fetch("/api/worker/history", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setHistoryName(data.name ?? workerName);
        setHistoryRecords(data.records ?? []);
        setCorrections(data.corrections ?? {});
        setReportingId(null);
      }
      else if (res.status === 401) { setHistoryError(T[lang].sessionExpired); setIdentifiedStaffId(null); }
      else if (res.status === 429) { setHistoryError(T[lang].tooManyAttempts); }
      else { setHistoryError(T[lang].unknownError); }
    } catch { setHistoryError(T[lang].unknownError); }
    finally { setHistoryLoading(false); }
  }, [identifiedStaffId, workerName, lang]);

  const submitManual = useCallback(async () => {
    if (!identifiedStaffId) { setStep("phone"); return; }
    if (!manualDate || !manualTime) { setManualError(T[lang].manualValidation); return; }
    setManualLoading(true); setManualError(null);
    try {
      const res = await fetch("/api/worker/manual-entry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:     manualAction,
          date:       manualDate,
          time:       manualTime,
          ...(manualProject && { project_id: manualProject }),
        }),
      });
      const data = await res.json();
      if (data.success) { setStep("manualSuccess"); }
      else if (res.status === 401) { setManualError(T[lang].sessionExpired); setIdentifiedStaffId(null); }
      else if (res.status === 429) { setManualError(T[lang].tooManyAttempts); }
      else { setManualError(data.error ?? T[lang].unknownError); }
    } catch { setManualError(T[lang].networkError); }
    finally { setManualLoading(false); }
  }, [identifiedStaffId, manualAction, manualDate, manualTime, manualProject, lang]);

  // ── Dispatch ──────────────────────────────────────────────────────────────
  // Common props every screen receives. The per-screen components are pure
  // presentation; they read these and dispatch back via the callbacks above.
  const common = { t, lang, onLangChange: setLang, backHref: portalHref, backLabel };

  if (step === "success") {
    return (
      <SuccessScreen {...common}
        action={action} workerName={workerName} timestamp={timestamp}
        projects={projects} selectedProjectId={selectedProjectId}
        autoRegistered={autoRegistered} dailyMessage={dailyMessage}
        showFlash={showFlash} flashVariant={flashVariant}
        onFlashDone={() => setShowFlash(false)}
        onReset={reset}
      />
    );
  }

  if (step === "error")      return <ErrorScreen {...common} errorMsg={errorMsg} onReset={reset} />;
  if (step === "submitting") return <SubmittingScreen {...common} />;
  if (step === "locating")   return <LocatingScreen {...common} />;

  if (step === "project") {
    return (
      <ProjectScreen {...common}
        projects={projects}
        projectsLoading={projectsLoading}
        selectedProjectId={selectedProjectId}
        onPickProject={(id) => { setSelectedProjectId(id); setStep("ready"); }}
        onReset={reset}
      />
    );
  }

  if (step === "ready" && coords) {
    return (
      <ReadyScreen {...common}
        workerName={workerName}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSubmit={submit}
        onChangeProject={() => setStep("project")}
        onReset={reset}
      />
    );
  }

  if (step === "history") {
    return (
      <HistoryScreen {...common}
        historyRecords={historyRecords}
        historyName={historyName}
        historyLoading={historyLoading}
        historyError={historyError}
        corrections={corrections}
        reportingId={reportingId}
        setReportingId={setReportingId}
        onShowManual={() => { setManualDate(new Date().toISOString().slice(0, 10)); setManualTime(""); setManualProject(""); setManualError(null); setStep("manual"); }}
        onReset={reset}
        onFetchHistory={fetchHistory}
      />
    );
  }

  if (step === "manual") {
    return (
      <ManualScreen {...common}
        manualAction={manualAction}     setManualAction={setManualAction}
        manualDate={manualDate}         setManualDate={setManualDate}
        manualTime={manualTime}         setManualTime={setManualTime}
        manualProject={manualProject}   setManualProject={setManualProject}
        manualLoading={manualLoading}
        manualError={manualError}
        projects={projects}
        onSubmit={submitManual}
        onBackToHistory={() => setStep("history")}
      />
    );
  }

  if (step === "manualSuccess") {
    return <ManualSuccessScreen {...common} onShowHistory={fetchHistory} onReset={reset} />;
  }

  if (step === "menu" && identifiedStaffId) {
    return (
      <MenuScreen {...common}
        workerName={workerName}
        geoError={geoError}
        missingExitCount={missingExitCount}
        onStartClock={requestLocation}
        onShowHistory={fetchHistory}
        onShowManual={() => setStep("manual")}
        onSwitchUser={switchUser}
      />
    );
  }

  // While the mount probe runs, render nothing — avoids a phone-input flash
  // for workers who already have a valid session cookie.
  if (!identifyCheckDone) return null;

  // Default: phone-entry → /api/worker/identify (NOT clock-in).
  // Wrap setPhone so editing the phone clears any stale identifyError —
  // otherwise a previous 401/404 message keeps reading like a fresh error
  // even after the worker starts typing a new number.
  const onPhoneChange = (v: string) => {
    setPhone(v);
    if (identifyError) setIdentifyError(null);
  };
  return (
    <PhoneScreen {...common}
      phone={phone} setPhone={onPhoneChange}
      identifying={identifying}
      identifyError={identifyError}
      onIdentify={identify}
    />
  );
}
