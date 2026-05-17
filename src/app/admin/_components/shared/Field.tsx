import React from "react";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[0.7rem] text-charcoal/50">{label}</label>
      {children}
    </div>
  );
}
