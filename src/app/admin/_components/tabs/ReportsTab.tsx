"use client";

import { useState, useEffect } from "react";
import { ClipboardList } from "lucide-react";
import { useFeedback } from "../../../hooks/useFeedback";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { Btn } from "../shared/Btn";
import { TabRefreshBar } from "../shared/TabRefreshBar";
import { INPUT, WEATHER_OPTIONS } from "../shared/constants";
import type { DailyReport } from "../shared/types";

type ReportsTabProps = {
  activeProjects: { id: string; name: string }[];
  lastRefreshed: Date | null;
  refreshing: boolean;
  onTabRefresh: () => void;
};

export default function ReportsTab({
  activeProjects,
  lastRefreshed,
  refreshing,
  onTabRefresh,
}: ReportsTabProps) {
  const feedback = useFeedback();

  // Reports list (loaded from API)
  const [reports, setReports] = useState<DailyReport[]>([]);

  // Form state
  const [reportProjectId, setReportProjectId] = useState("");
  const [reportDate, setReportDate]           = useState(new Date().toISOString().slice(0, 10));
  const [reportWeather, setReportWeather]     = useState("");
  const [reportSummary, setReportSummary]     = useState("");
  const [reportSpecial, setReportSpecial]     = useState("");
  const [reportLoading, setReportLoading]     = useState(false);
  const [reportMsg, setReportMsg]             = useState("");

  // Load reports on mount (lazy-load means this runs only when user opens the tab)
  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const res = await fetch("/api/admin/daily-reports");
    if (res.ok) {
      const d = await res.json();
      setReports(d.reports ?? []);
    }
  }

  async function handleAddReport(e: React.FormEvent) {
    e.preventDefault();
    setReportLoading(true);
    setReportMsg("");
    try {
      const res = await fetch("/api/admin/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: reportProjectId,
          date: reportDate,
          weather: reportWeather,
          summary: reportSummary,
          special_events: reportSpecial,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        feedback.success();
        setReportMsg("✓ דוח נשמר");
        setReportSummary("");
        setReportSpecial("");
        setReportWeather("");
        loadReports();
      } else {
        feedback.error();
        setReportMsg("שגיאה: " + (data.error ?? res.status));
      }
    } catch (err) {
      setReportMsg("שגיאת רשת: " + String(err));
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <TabRefreshBar loading={refreshing} onRefresh={onTabRefresh} lastRefreshed={lastRefreshed} />
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList size={16} strokeWidth={1.5} className="text-accent" />
          <h2 className="font-heading text-base font-bold">הגשת דוח יומי</h2>
        </div>
        <form onSubmit={handleAddReport} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="פרויקט">
              <select value={reportProjectId} onChange={e => setReportProjectId(e.target.value)} required className={INPUT}>
                <option value="">בחר פרויקט...</option>
                {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="תאריך"><input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className={INPUT} dir="ltr" /></Field>
          </div>
          <Field label="מזג אוויר">
            <select value={reportWeather} onChange={e => setReportWeather(e.target.value)} className={INPUT}>
              <option value="">בחר...</option>
              {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </Field>
          <Field label="סיכום עבודה">
            <textarea value={reportSummary} onChange={e => setReportSummary(e.target.value)} placeholder="תאר את עבודת היום..." rows={4} className={`${INPUT} resize-none`} />
          </Field>
          <Field label="אירועים מיוחדים">
            <textarea value={reportSpecial} onChange={e => setReportSpecial(e.target.value)} placeholder="תקלות, ביקורת, הנחיות..." rows={2} className={`${INPUT} resize-none`} />
          </Field>
          <Btn loading={reportLoading} disabled={!reportProjectId}>שמור דוח</Btn>
          {reportMsg && <p className={`text-xs ${reportMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{reportMsg}</p>}
        </form>
      </Card>

      {reports.length > 0 && (
        <Card title="דוחות אחרונים">
          <div className="divide-y divide-charcoal/5">
            {reports.slice(0, 10).map(r => (
              <div key={r.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{(r.project as { name?: string } | null)?.name ?? r.project_id}</p>
                  <span className="text-[0.7rem] text-charcoal/40 tabular-nums">{r.date}</span>
                </div>
                {r.weather        && <p className="text-xs text-charcoal/50">{r.weather}</p>}
                {r.summary        && <p className="text-xs text-charcoal/70 line-clamp-2">{r.summary}</p>}
                {r.special_events && <p className="text-xs text-amber-600 line-clamp-1">⚠️ {r.special_events}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
