"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { Btn } from "../shared/Btn";
import { TabRefreshBar } from "../shared/TabRefreshBar";
import { INPUT } from "../shared/constants";

interface ProjectLite {
  id: string;
  name: string;
}

interface IncomeRecord {
  id: string;
  project_id: string;
  amount: number;
  description: string | null;
  received_date: string;
  created_at: string;
  project?: { id: string; name: string } | null;
}

type Props = {
  projects: ProjectLite[];
  income: IncomeRecord[];
  incomeTotals: Record<string, number>;
  incProjectId: string;
  setIncProjectId: (v: string) => void;
  incAmount: string;
  setIncAmount: (v: string) => void;
  incDesc: string;
  setIncDesc: (v: string) => void;
  incDate: string;
  setIncDate: (v: string) => void;
  incLoading: boolean;
  incMsg: string;
  onAddIncome: (e: React.FormEvent) => void | Promise<void>;
  lastRefreshed: Date | null;
  refreshing: boolean;
  onTabRefresh: () => void;
};

export default function IncomeTab({
  projects,
  income,
  incomeTotals,
  incProjectId, setIncProjectId,
  incAmount,    setIncAmount,
  incDesc,      setIncDesc,
  incDate,      setIncDate,
  incLoading,
  incMsg,
  onAddIncome,
  lastRefreshed,
  refreshing,
  onTabRefresh,
}: Props) {
  return (
    <div className="space-y-5">
      <TabRefreshBar loading={refreshing} onRefresh={onTabRefresh} lastRefreshed={lastRefreshed} />
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} strokeWidth={1.5} className="text-accent" />
          <h2 className="font-heading text-base font-bold">רישום תשלום</h2>
        </div>
        <form onSubmit={onAddIncome} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="פרויקט">
              <select value={incProjectId} onChange={e => setIncProjectId(e.target.value)} required className={INPUT}>
                <option value="">בחר פרויקט...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="תאריך קבלה"><input type="date" value={incDate} onChange={e => setIncDate(e.target.value)} className={INPUT} dir="ltr" /></Field>
          </div>
          <Field label="סכום (₪)"><input value={incAmount} onChange={e => setIncAmount(e.target.value)} required type="number" min="1" step="any" placeholder="10,000" dir="ltr" className={INPUT} /></Field>
          <Field label="תיאור / הערה"><input value={incDesc} onChange={e => setIncDesc(e.target.value)} placeholder="מקדמה ראשונה, תשלום סופי..." className={INPUT} /></Field>
          <Btn loading={incLoading} disabled={!incProjectId || !incAmount}>רשום תשלום</Btn>
          {incMsg && <p className={`text-xs ${incMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{incMsg}</p>}
        </form>
      </Card>

      {income.length > 0 && (
        <>
          <Card title="סיכום הכנסות לפי פרויקט">
            <div className="divide-y divide-charcoal/5">
              {Object.entries(incomeTotals).map(([projId, total]) => {
                const proj = projects.find(p => p.id === projId);
                return (
                  <div key={projId} className="flex justify-between items-center py-2">
                    <span className="text-sm text-charcoal/60 truncate flex-1">{proj?.name ?? projId}</span>
                    <span className="text-sm font-semibold tabular-nums text-green-600">₪{total.toLocaleString("he-IL")}</span>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-bold">סה&quot;כ הכנסות</span>
                <span className="text-base font-bold text-green-600 tabular-nums">
                  ₪{Object.values(incomeTotals).reduce((a, b) => a + b, 0).toLocaleString("he-IL")}
                </span>
              </div>
            </div>
          </Card>

          <Card title="יומן תשלומים">
            <div className="divide-y divide-charcoal/5">
              {income.map(r => (
                <div key={r.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {(r.project as { name?: string } | null)?.name ?? projects.find(p => p.id === r.project_id)?.name ?? "—"}
                    </p>
                    {r.description && <p className="text-xs text-charcoal/70">{r.description}</p>}
                    <p className="text-[0.75rem] text-charcoal/70 tabular-nums" dir="ltr">{r.received_date}</p>
                  </div>
                  <span className="text-sm font-bold text-green-600 tabular-nums shrink-0">+₪{r.amount.toLocaleString("he-IL")}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
