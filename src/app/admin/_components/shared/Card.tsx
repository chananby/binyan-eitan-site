import React from "react";

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  // shadow-sm gives the card a faint lift off the bone-dark page bg —
  // restores the visual hierarchy that the warm-gray border alone left
  // ambiguous. Card-in-card situations are rare in this codebase; the
  // inner card simply inherits the outer's shadow without amplification.
  // Title bumped to text-base (16px). It's a section heading on every
  // card across the admin portal — text-sm (14px) put it under the
  // readability floor on the very screens we open in the morning.
  return (
    <div className="bg-white border border-warm-gray-light shadow-sm p-5 space-y-3">
      {title && <h2 className="font-heading text-base font-bold text-charcoal">{title}</h2>}
      {children}
    </div>
  );
}
