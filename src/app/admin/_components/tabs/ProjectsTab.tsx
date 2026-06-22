"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Building2, RefreshCw } from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { Btn } from "../shared/Btn";
import { TabRefreshBar } from "../shared/TabRefreshBar";
import { INPUT } from "../shared/constants";
import { AutoGrowTextarea } from "../../../components/AutoGrowTextarea";
import ProjectBudgetSection, { type ProjectBudgetRow } from "../shared/ProjectBudgetSection";

interface Project {
  id: string;
  name: string;
  status?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  foreman_id?: string | null;
}

interface StaffLite {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

interface TaskLite {
  project_id: string;
  status: "planned" | "in_progress" | "completed" | "delayed";
}

type Props = {
  projects: Project[];
  staff: StaffLite[];
  tasks: TaskLite[];

  newProjectName:    string; setNewProjectName:    (v: string) => void;
  newProjectAddress: string; setNewProjectAddress: (v: string) => void;
  projectAddLoading: boolean;
  projectAddMsg:     string;
  onAddProject: (e: React.FormEvent) => void | Promise<void>;

  editingProjectId:    string | null; setEditingProjectId: (v: string | null) => void;
  editProjectAddress:  string;        setEditProjectAddress: (v: string) => void;
  editProjectSaving:   boolean;
  editProjectMsg:      string;        setEditProjectMsg:   (v: string) => void;
  onStartEditAddress:  (p: Project) => void;
  onSaveProjectAddress:(id: string) => void | Promise<void>;
  onToggleProjectStatus:(id: string, currentStatus: string) => void | Promise<void>;
  onReload: () => void | Promise<void>;

  lastRefreshed: Date | null;
  refreshing: boolean;
  dataLoading: boolean;
  onTabRefresh: () => void;
};

export default function ProjectsTab(p: Props) {
  // Per-project budget-vs-actual, fetched once and refreshed after a budget
  // edit. Keyed by project_id for O(1) lookup per card.
  const [budgetMap, setBudgetMap] = useState<Map<string, ProjectBudgetRow>>(new Map());
  const fetchBudget = useCallback(() => {
    fetch("/api/admin/projects/budget-actual", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const m = new Map<string, ProjectBudgetRow>();
        for (const row of (d.rows ?? []) as ProjectBudgetRow[]) m.set(row.project_id, row);
        setBudgetMap(m);
      })
      .catch(() => {});
  }, []);
  useEffect(() => { fetchBudget(); }, [fetchBudget, p.projects.length]);

  return (
    <div className="space-y-5">
      <TabRefreshBar loading={p.refreshing || p.dataLoading} onRefresh={p.onTabRefresh} lastRefreshed={p.lastRefreshed} />
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={16} strokeWidth={1.5} className="text-accent" />
          <h2 className="font-heading text-base font-bold">הוספת פרויקט</h2>
        </div>
        <form onSubmit={p.onAddProject} className="space-y-3">
          <Field label="שם הפרויקט / אתר">
            <AutoGrowTextarea value={p.newProjectName} onChange={e => p.setNewProjectName(e.target.value)} required placeholder="פרויקט רחוב הרצל 12" className={INPUT} />
          </Field>
          <Field label="כתובת האתר (לאיתור GPS)">
            <input
              value={p.newProjectAddress}
              onChange={e => p.setNewProjectAddress(e.target.value)}
              placeholder="רחוב + מספר, עיר (למשל: הרצל 12, ירושלים)"
              className={INPUT}
            />
            <p className="text-[0.62rem] text-charcoal/70 mt-1">
              המערכת תמיר אוטומטית לקואורדינטות. בכניסה/יציאה של עובד, אם המיקום שלו רחוק מעל הסף — תופיע אזהרה אדומה.
            </p>
          </Field>
          <Btn loading={p.projectAddLoading}>הוסף פרויקט</Btn>
          {p.projectAddMsg && <p className={`text-xs ${p.projectAddMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{p.projectAddMsg}</p>}
        </form>
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-base font-bold">פרויקטים ({p.projects.length})</h2>
          <button onClick={p.onReload} className="flex items-center gap-1 text-xs text-charcoal/70 hover:text-accent transition-colors"><RefreshCw size={12} strokeWidth={1.5} /> רענן</button>
        </div>
        {p.projects.length === 0 && <p className="text-sm text-charcoal/70 text-center py-4">אין פרויקטים</p>}
        <div className="divide-y divide-charcoal/5">
          {p.projects.map((proj) => {
            const assignedForeman = p.staff.find(s => s.id === proj.foreman_id);
            const hasCoords = proj.lat != null && proj.lng != null;
            const isEditingAddr = p.editingProjectId === proj.id;
            return (
            <div key={proj.id} className={`py-3 space-y-2 ${proj.status !== "active" ? "opacity-45" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{proj.name}</p>
                  <p className="text-[0.75rem] text-charcoal/70">{p.tasks.filter(t => t.project_id === proj.id && t.status !== "completed").length} משימות פעילות</p>
                </div>
                <span className={`text-[0.75rem] px-2 py-0.5 shrink-0 ${proj.status === "active" ? "bg-green-50 text-green-600" : "bg-charcoal/5 text-charcoal/70"}`}>{proj.status === "active" ? "פעיל" : "לא פעיל"}</span>
                <button onClick={() => p.onToggleProjectStatus(proj.id, proj.status ?? "active")} className="text-xs border border-charcoal/15 px-2.5 py-1 hover:border-accent hover:text-accent transition-colors shrink-0">{proj.status === "active" ? "השבת" : "הפעל"}</button>
              </div>

              {/* Address + GPS status */}
              <div className="flex items-center gap-2 text-[0.75rem] flex-wrap">
                <span className="text-charcoal/70 shrink-0">📍 כתובת:</span>
                {isEditingAddr ? (
                  <>
                    <input
                      value={p.editProjectAddress}
                      onChange={e => p.setEditProjectAddress(e.target.value)}
                      placeholder="רחוב + מספר, עיר"
                      className="flex-1 min-w-[180px] border border-charcoal/15 bg-bone px-2 py-1 focus:border-accent focus:outline-none"
                    />
                    <button
                      onClick={() => p.onSaveProjectAddress(proj.id)}
                      disabled={p.editProjectSaving}
                      className="text-[0.75rem] border border-accent bg-accent text-bone px-2 py-1 hover:bg-accent-dark disabled:opacity-40 transition-colors shrink-0"
                    >
                      {p.editProjectSaving ? "שומר..." : "שמור + מקם"}
                    </button>
                    <button
                      onClick={() => { p.setEditingProjectId(null); p.setEditProjectMsg(""); }}
                      className="text-[0.75rem] border border-charcoal/15 text-charcoal/65 px-2 py-1 hover:border-accent transition-colors shrink-0"
                    >
                      ביטול
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 text-charcoal/60 truncate">
                      {proj.address || <span className="text-charcoal/70 italic">לא הוגדרה</span>}
                    </span>
                    {hasCoords ? (
                      <a
                        href={`https://www.google.com/maps?q=${proj.lat},${proj.lng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[0.75rem] text-green-700 bg-green-50 px-1.5 py-0.5 shrink-0 hover:bg-green-100 transition-colors"
                        title="פתח במפה"
                      >
                        ✓ GPS
                      </a>
                    ) : proj.address ? (
                      <span className="text-[0.75rem] text-amber-700 bg-amber-50 px-1.5 py-0.5 shrink-0">⚠ ללא קואורדינטות</span>
                    ) : null}
                    <button
                      onClick={() => p.onStartEditAddress(proj)}
                      className="text-[0.75rem] border border-charcoal/15 text-charcoal/65 px-2 py-1 hover:border-accent hover:text-accent transition-colors shrink-0"
                    >
                      ערוך
                    </button>
                  </>
                )}
              </div>
              {isEditingAddr && p.editProjectMsg && (
                <p className={`text-[0.75rem] ${p.editProjectMsg.startsWith("נשמר") || p.editProjectMsg.startsWith("שגיאה") ? "text-amber-700" : "text-red-500"}`}>{p.editProjectMsg}</p>
              )}
              {/* Foreman assignment */}
              <div className="flex items-center gap-2">
                <span className="text-[0.75rem] text-charcoal/70 shrink-0">ממונה:</span>
                <select
                  value={proj.foreman_id ?? ""}
                  onChange={async e => {
                    await fetch(`/api/admin/projects/${proj.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foreman_id: e.target.value || null }) });
                    p.onReload();
                  }}
                  className="flex-1 text-[0.75rem] border border-charcoal/10 bg-bone px-2 py-1 focus:border-accent focus:outline-none"
                >
                  <option value="">— ללא ממונה —</option>
                  {p.staff.filter(s => s.role === "ממונה" && s.active).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {assignedForeman && (
                  <span className="text-[0.75rem] bg-accent/10 text-accent px-1.5 py-0.5 shrink-0">{assignedForeman.name}</span>
                )}
              </div>

              {/* Budget vs. actual (financial_documents-based) */}
              <ProjectBudgetSection projectId={proj.id} data={budgetMap.get(proj.id)} onSaved={fetchBudget} />
            </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
