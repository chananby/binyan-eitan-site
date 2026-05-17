import React from "react";

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-warm-gray-light p-5 space-y-3">
      {title && <h2 className="font-heading text-sm font-bold">{title}</h2>}
      {children}
    </div>
  );
}
