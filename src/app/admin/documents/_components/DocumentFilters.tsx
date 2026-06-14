"use client";

// Collapsible filter bar for the inbox (collapsed by default on mobile).
// Controlled — the parent owns the filter state and refetches on change.

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import ProjectSelect from "./ProjectSelect";
import {
  DOC_TYPE_LABELS, DIRECTION_LABELS, CATEGORY_LABELS,
  DOC_TYPE_OPTIONS, DIRECTION_OPTIONS, CATEGORY_OPTIONS,
} from "./labels";

export interface DocFilters {
  status: string;
  doc_type: string;
  direction: string;
  category: string;
  vendor_id: string;
  project_id: string;
  date_from: string;
  date_to: string;
  q: string;
}

export const EMPTY_FILTERS: DocFilters = {
  status: "", doc_type: "", direction: "", category: "", vendor_id: "", project_id: "",
  date_from: "", date_to: "", q: "",
};

interface Opt { id: string; name: string; status?: string | null }

const SELECT = "w-full border border-[#2D2926]/15 rounded-md bg-white px-2.5 py-2 text-sm focus:outline-none focus:border-[#8D775F]";

export default function DocumentFilters({
  filters, setFilters, vendors, projects,
}: {
  filters: DocFilters;
  setFilters: (f: DocFilters) => void;
  vendors: Opt[];
  projects: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const set = (k: keyof DocFilters, v: string) => setFilters({ ...filters, [k]: v });
  const activeCount = Object.entries(filters).filter(([k, v]) => k !== "q" && v).length;

  return (
    <div className="bg-white border border-[#2D2926]/10 rounded-md shadow-sm">
      <div className="flex items-center gap-2 p-3">
        <input
          type="text"
          value={filters.q}
          onChange={e => set("q", e.target.value)}
          placeholder="חיפוש (ספק / מס' מסמך / תיאור)..."
          className="flex-1 border border-[#2D2926]/15 rounded-md bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#8D775F]"
        />
        <button
          onClick={() => setOpen(o => !o)}
          className="shrink-0 flex items-center gap-1.5 text-sm border border-[#2D2926]/15 rounded-md px-3 py-2 text-[#2D2926]/70 hover:border-[#8D775F]"
        >
          <SlidersHorizontal size={15} />
          סינון
          {activeCount > 0 && <span className="bg-[#8D775F] text-white text-[0.65rem] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{activeCount}</span>}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#2D2926]/10 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="text-xs text-[#2D2926]/60">סטטוס
            <select value={filters.status} onChange={e => set("status", e.target.value)} className={SELECT}>
              <option value="">הכל</option>
              <option value="pending">ממתין</option>
              <option value="approved">מאושר</option>
              <option value="rejected">נדחה</option>
            </select>
          </label>
          <label className="text-xs text-[#2D2926]/60">סוג מסמך
            <select value={filters.doc_type} onChange={e => set("doc_type", e.target.value)} className={SELECT}>
              <option value="">הכל</option>
              {DOC_TYPE_OPTIONS.map(t => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#2D2926]/60">כיוון
            <select value={filters.direction} onChange={e => set("direction", e.target.value)} className={SELECT}>
              <option value="">הכל</option>
              {DIRECTION_OPTIONS.map(d => <option key={d} value={d}>{DIRECTION_LABELS[d]}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#2D2926]/60">קטגוריה
            <select value={filters.category} onChange={e => set("category", e.target.value)} className={SELECT}>
              <option value="">הכל</option>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#2D2926]/60">ספק
            <select value={filters.vendor_id} onChange={e => set("vendor_id", e.target.value)} className={SELECT}>
              <option value="">הכל</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#2D2926]/60">פרויקט
            <ProjectSelect value={filters.project_id} onChange={v => set("project_id", v)} projects={projects} emptyLabel="הכל" className={SELECT} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-[#2D2926]/60">מתאריך
              <input type="date" value={filters.date_from} onChange={e => set("date_from", e.target.value)} className={SELECT} />
            </label>
            <label className="text-xs text-[#2D2926]/60">עד תאריך
              <input type="date" value={filters.date_to} onChange={e => set("date_to", e.target.value)} className={SELECT} />
            </label>
          </div>
          {activeCount > 0 && (
            <button
              onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })}
              className="sm:col-span-2 flex items-center justify-center gap-1.5 text-sm text-[#2D2926]/60 hover:text-red-600 py-1"
            >
              <X size={14} /> נקה סינון
            </button>
          )}
        </div>
      )}
    </div>
  );
}
