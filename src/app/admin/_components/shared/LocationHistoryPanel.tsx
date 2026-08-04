"use client";

/**
 * LocationHistoryPanel — "מיקומים", the per-worker location-history screen.
 * Pick a worker + date range → one row per clock-in with distance-from-site,
 * so an admin can answer "when was this worker where" and spot clock-ins far
 * from the site. ADMIN ONLY (lives in AttendanceTab, which the foreman portal
 * never renders; the endpoint also 403s foremen).
 *
 * Self-contained like MonthlyReportPanel: owns its own fetch + state, takes
 * only the worker list. Reuses the shared DistanceFlag (with its optional
 * amber middle tier) — no second distance badge.
 *
 * Coverage reality (why the "no GPS" rows exist): only web/app clock-ins carry
 * lat/lng (the app requires them). Phone (Twilio) and manual admin/foreman
 * entries never have GPS by design — they show a neutral "ללא GPS" tag, NOT a
 * missing/anomaly. Distance is present only when the row has GPS *and* the
 * project has coordinates.
 */

import { useState } from "react";
import { MapPin, Loader2, AlertCircle, Search } from "lucide-react";
import { Card } from "./Card";
import DistanceFlag from "./DistanceFlag";
import { isEntry } from "../../../../lib/attendance-time";

interface StaffLite { id: string; name: string; active: boolean }

// ── Anomaly thresholds (metres) — tune here ───────────────────────────────────
// Deliberately higher than the live board's 500 m "far" flag: at city scale a
// worker legitimately clocks in a few hundred metres off (parking, GPS drift,
// site entrance vs. pin). Field data (Aug 2026): 500 m flagged ~200 events —
// mostly urban noise. Three tiers keep the real outliers visible:
//   • ≤ NEUTRAL_MAX_M            → neutral (סטייה סבירה)
//   • NEUTRAL_MAX_M–ANOMALY_MIN_M → amber "רחוק"
//   • > ANOMALY_MIN_M           → red "חריגה"
const NEUTRAL_MAX_M = 1000; // up to 1 km reads as normal
const ANOMALY_MIN_M = 3000; // over 3 km is a real anomaly
// "Anomalies only" filter shows everything above the neutral band (> 1 km).
const ANOMALY_FILTER_M = NEUTRAL_MAX_M;

type LocRow = {
  id: string;
  action: string;
  clock_at: string;
  ymd: string;
  source: string | null;
  lat: string | null;
  lng: string | null;
  distance_from_project_m: number | null;
  project_name: string | null;
};

// Human label + neutral "no GPS" reason per source. Web/app carries GPS; the
// other two never do (see file header), so their distance cell shows why.
const SOURCE_LABEL: Record<string, string> = {
  web: "אפליקציה",
  "phone-call": "טלפון",
  manual: "ידני",
};
const NO_GPS_REASON: Record<string, string> = {
  "phone-call": "ללא GPS — טלפון",
  manual: "ללא GPS — ידני",
};

function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

const today = () => new Date().toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toLocaleDateString("sv", { timeZone: "Asia/Jerusalem" });

export default function LocationHistoryPanel({ staff }: { staff: StaffLite[] }) {
  const [staffId, setStaffId] = useState<string>("");
  const [from, setFrom] = useState<string>(daysAgo(29));
  const [to, setTo]     = useState<string>(today());
  const [rows, setRows] = useState<LocRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);

  async function fetchRows() {
    if (!staffId) return;
    setLoading(true); setErr(null); setRows(null);
    try {
      const res = await fetch(
        `/api/admin/attendance/locations?staff_id=${staffId}&from=${from}&to=${to}`,
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `שגיאה ${res.status}`);
      }
      const d = await res.json() as { rows: LocRow[] };
      setRows(d.rows ?? []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  const anomalyCount =
    rows?.filter((r) => r.distance_from_project_m != null && r.distance_from_project_m > ANOMALY_FILTER_M)
      .length ?? 0;
  const shown = anomaliesOnly
    ? (rows ?? []).filter((r) => r.distance_from_project_m != null && r.distance_from_project_m > ANOMALY_FILTER_M)
    : (rows ?? []);

  const inputCls =
    "w-full border border-warm-gray-light bg-bone text-charcoal text-content px-3 py-2 focus:outline-none focus:border-accent";

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={15} strokeWidth={1.5} className="text-accent shrink-0" />
        <h2 className="font-heading text-base font-bold flex-1 text-start">היסטוריית מיקומים לעובד</h2>
      </div>
      <p className="text-caption text-muted mb-3">
        שורה לכל החתמה עם המרחק מהאתר — לאיתור החתמות רחוקות. מיקום נרשם רק בהחתמות מהאפליקציה;
        טלפון והזנה ידנית תמיד ללא GPS.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-caption text-muted mb-1 font-body">עובד</label>
          <select
            value={staffId}
            onChange={(e) => { setStaffId(e.target.value); setRows(null); }}
            className={inputCls}
          >
            <option value="">בחר עובד…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.active === false ? " (לא פעיל)" : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-caption text-muted mb-1 font-body">מתאריך</label>
          <input type="date" value={from} max={to}
            onChange={(e) => { setFrom(e.target.value); setRows(null); }} className={inputCls} />
        </div>
        <div>
          <label className="block text-caption text-muted mb-1 font-body">עד תאריך</label>
          <input type="date" value={to} min={from} max={today()}
            onChange={(e) => { setTo(e.target.value); setRows(null); }} className={inputCls} />
        </div>
        <button
          onClick={fetchRows}
          disabled={loading || !staffId}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-bone text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {loading
            ? <><Loader2 size={13} className="animate-spin" /> טוען...</>
            : <><Search size={13} /> הצג</>}
        </button>
      </div>

      {err && (
        <p className="mt-3 flex items-center gap-1.5 text-caption text-red-600">
          <AlertCircle size={12} /> {err}
        </p>
      )}

      {rows && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-caption text-charcoal/70">
              {rows.length} החתמות
              {anomalyCount > 0 && <> · <span className="text-amber-700 font-semibold">{anomalyCount} מעל {ANOMALY_FILTER_M / 1000} ק&quot;מ</span></>}
            </p>
            <label className="flex items-center gap-1.5 text-caption text-charcoal/80 cursor-pointer select-none">
              <input type="checkbox" checked={anomaliesOnly}
                onChange={(e) => setAnomaliesOnly(e.target.checked)}
                className="accent-accent" />
              חריגות בלבד (מעל {ANOMALY_FILTER_M / 1000} ק&quot;מ)
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="text-caption text-charcoal/60 text-center py-6">
              {anomaliesOnly ? "אין חריגות בטווח שנבחר." : "אין החתמות בטווח שנבחר."}
            </p>
          ) : (
            <ul className="divide-y divide-charcoal/10 border border-charcoal/10 rounded-md overflow-hidden">
              {shown.map((r) => {
                const entry = isEntry(r.action);
                const noGps = NO_GPS_REASON[r.source ?? ""];
                return (
                  <li key={r.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-content hover:bg-bone/40">
                    <span className="tabular-nums text-charcoal/70 min-w-[3.5rem]" dir="ltr">{fmtDate(r.ymd)}</span>
                    <span className="tabular-nums text-charcoal/80 min-w-[3rem]" dir="ltr">{fmtTime(r.clock_at)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-micro font-semibold shrink-0 ${
                      entry ? "bg-green-50 text-green-700" : "bg-charcoal/[0.06] text-charcoal/70"}`}>
                      {entry ? "כניסה" : "יציאה"}
                    </span>
                    <span className="text-charcoal/60 truncate max-w-[9rem]">{r.project_name ?? "—"}</span>
                    <span className="ms-auto flex items-center gap-2 shrink-0">
                      {noGps ? (
                        <span className="text-[0.75rem] font-semibold px-1.5 py-0.5 bg-charcoal/[0.04] text-charcoal/50"
                          title="מקור ללא נתוני מיקום">{noGps}</span>
                      ) : (
                        <DistanceFlag r={r} threshold={ANOMALY_MIN_M} warnThreshold={NEUTRAL_MAX_M} />
                      )}
                      <span className="text-micro text-charcoal/45 min-w-[3.5rem] text-start">
                        {SOURCE_LABEL[r.source ?? ""] ?? r.source ?? "—"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
