"use client";

import React from "react";
import { Package, RefreshCw } from "lucide-react";
import { Card } from "../shared/Card";
import { Field } from "../shared/Field";
import { Btn } from "../shared/Btn";
import { TabRefreshBar } from "../shared/TabRefreshBar";
import { INPUT } from "../shared/constants";
import { AutoGrowTextarea } from "../../../components/AutoGrowTextarea";

interface ProjectLite {
  id: string;
  name: string;
  status?: string;
}

interface Material {
  id: string;
  project_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  supplier: string | null;
  cost: number | null;
  category?: string;
  received_at: string | null;
}

interface BudgetLine {
  project_id: string;
  project_name: string;
  total: number;
}

type Props = {
  materials: Material[];
  budget: BudgetLine[];
  projects: ProjectLite[];
  activeProjects: ProjectLite[];

  // Form state
  matProjectId: string; setMatProjectId: (v: string) => void;
  matCategory:  string; setMatCategory:  (v: string) => void;
  matName:      string; setMatName:      (v: string) => void;
  matSupplier:  string; setMatSupplier:  (v: string) => void;
  matQty:       string; setMatQty:       (v: string) => void;
  matUnit:      string; setMatUnit:      (v: string) => void;
  matCost:      string; setMatCost:      (v: string) => void;
  matLoading:   boolean;
  matMsg:       string;
  matFilter:    string; setMatFilter:    (v: string) => void;
  onAddMaterial: (e: React.FormEvent) => void | Promise<void>;
  onReloadMaterials: () => void | Promise<void>;

  // Shared category/unit option lists — keep parent ownership so the
  // values stay in lockstep with the rest of the admin domain.
  expenseCategories: readonly string[];
  units:             readonly string[];

  lastRefreshed: Date | null;
  refreshing: boolean;
  onTabRefresh: () => void;
};

export default function ExpensesTab(p: Props) {
  return (
    <div className="space-y-5">
      <TabRefreshBar loading={p.refreshing} onRefresh={p.onTabRefresh} lastRefreshed={p.lastRefreshed} />
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Package size={16} strokeWidth={1.5} className="text-accent" />
          <h2 className="font-heading text-base font-bold">רישום הוצאה</h2>
        </div>
        <form onSubmit={p.onAddMaterial} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="פרויקט">
              <select value={p.matProjectId} onChange={e => p.setMatProjectId(e.target.value)} required className={INPUT}>
                <option value="">בחר פרויקט...</option>
                {p.activeProjects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
              </select>
            </Field>
            <Field label="קטגוריה">
              <select value={p.matCategory} onChange={e => p.setMatCategory(e.target.value)} className={INPUT}>
                {p.expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="תיאור / פריט"><AutoGrowTextarea value={p.matName} onChange={e => p.setMatName(e.target.value)} required placeholder="בטון, שרברב..." className={INPUT} /></Field>
            <Field label="ספק"><AutoGrowTextarea value={p.matSupplier} onChange={e => p.setMatSupplier(e.target.value)} placeholder="שם הספק" className={INPUT} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="כמות"><input value={p.matQty} onChange={e => p.setMatQty(e.target.value)} type="number" min="0" step="any" className={INPUT} dir="ltr" /></Field>
            <Field label="יחידה">
              <select value={p.matUnit} onChange={e => p.setMatUnit(e.target.value)} className={INPUT}>
                {p.units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="עלות (₪)"><input value={p.matCost} onChange={e => p.setMatCost(e.target.value)} type="number" min="0" step="any" placeholder="0.00" className={INPUT} dir="ltr" /></Field>
          </div>
          <Btn loading={p.matLoading} disabled={!p.matProjectId}>רשום הוצאה</Btn>
          {p.matMsg && <p className={`text-xs ${p.matMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{p.matMsg}</p>}
        </form>
      </Card>

      {p.materials.length > 0 && (
        <Card title="סיכום לפי קטגוריה">
          <div className="divide-y divide-charcoal/15">
            {p.expenseCategories.map(cat => {
              const total = p.materials.filter(m => (m.category ?? "חומרים") === cat).reduce((s, m) => s + (m.cost ?? 0), 0);
              if (!total) return null;
              return (
                <div key={cat} className="flex justify-between items-center py-2">
                  <span className="text-sm text-charcoal/60">{cat}</span>
                  <span className="text-sm font-semibold tabular-nums">₪{total.toLocaleString("he-IL")}</span>
                </div>
              );
            })}
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-bold">סה&quot;כ</span>
              <span className="text-base font-bold text-accent tabular-nums">₪{p.budget.reduce((s, b) => s + b.total, 0).toLocaleString("he-IL")}</span>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-sm font-bold">יומן הוצאות</h2>
          <div className="flex items-center gap-2">
            <select value={p.matFilter} onChange={e => p.setMatFilter(e.target.value)} className="text-xs border border-charcoal/15 bg-bone px-2 py-1 focus:border-accent focus:outline-none">
              <option value="">כל הפרויקטים</option>
              {p.projects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
            </select>
            <button onClick={p.onReloadMaterials} className="text-charcoal/70 hover:text-accent transition-colors"><RefreshCw size={12} strokeWidth={1.5} /></button>
          </div>
        </div>
        {p.materials.length === 0 && <p className="text-sm text-charcoal/70 text-center py-4">אין הוצאות רשומות</p>}
        <div className="divide-y divide-charcoal/15">
          {p.materials.map(m => (
            <div key={m.id} className="py-2.5 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.material_name}</p>
                <p className="text-xs text-charcoal/70">
                  {m.category && <span className="bg-charcoal/5 px-1.5 py-0.5 me-1.5">{m.category}</span>}
                  {m.quantity} {m.unit}{m.supplier ? ` · ${m.supplier}` : ""}
                </p>
              </div>
              {m.cost != null && <span className="text-sm font-bold text-accent tabular-nums shrink-0">₪{m.cost.toLocaleString("he-IL")}</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
