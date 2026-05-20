"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { Card } from "./Card";

// Severity drives the row color; "high" for things that block payroll/work
// (pending corrections), "medium" for active risks, "info" for hygiene.
type Severity = "high" | "medium" | "info";

export interface AttentionItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  severity: Severity;
  onClick: () => void;
}

interface Props {
  items: AttentionItem[];
}

const SEVERITY_CLS: Record<Severity, string> = {
  high:   "text-red-700   bg-red-50    border-red-200    hover:bg-red-100",
  medium: "text-amber-700 bg-amber-50  border-amber-200  hover:bg-amber-100",
  info:   "text-sky-700   bg-sky-50    border-sky-200    hover:bg-sky-100",
};

export default function AttentionPanel({ items }: Props) {
  const visible = items.filter(i => i.count > 0);
  if (visible.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card>
        <div className="flex items-center gap-2 mb-3 border-r-4 border-amber-500 pr-2">
          <AlertTriangle size={15} strokeWidth={1.5} className="text-amber-600" />
          <h2 className="font-heading text-sm font-bold text-charcoal">
            דורש תשומת לב ({visible.length})
          </h2>
        </div>
        <div className="space-y-1.5">
          {visible.map(item => (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 border transition-colors text-start ${SEVERITY_CLS[item.severity]}`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-sm font-semibold">
                <span className="tabular-nums">{item.count}</span> {item.label}
              </span>
              <ChevronLeft size={14} strokeWidth={1.5} className="shrink-0 opacity-50" />
            </button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
