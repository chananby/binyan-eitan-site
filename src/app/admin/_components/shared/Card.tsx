import React from "react";

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  // Depth treatment — subtle but readable lift off the bone-dark page bg:
  //   • rounded-md: 6px corners instead of the previous sharp-90° look,
  //     so the card reads as a card, not a clipped rectangle.
  //   • border-charcoal/10: replaces the warm-gray-light hairline that
  //     all-but-vanished against the page; charcoal-tinted is also more
  //     cohesive with the rest of the palette.
  //   • Charcoal-tinted shadow instead of plain-black shadow-sm — the
  //     warm bias (#2D2926 at ~6%) matches the rest of the natural-stone
  //     palette and reads as a soft lift rather than a "harsh" elevation.
  //
  // Title bumped to text-base (16px) — section heading on every card.
  return (
    <div className="bg-white border border-charcoal/10 rounded-md shadow-[0_1px_3px_rgba(45,41,38,0.06),0_1px_2px_rgba(45,41,38,0.04)] p-5 space-y-3">
      {title && <h2 className="font-heading text-base font-bold text-charcoal">{title}</h2>}
      {children}
    </div>
  );
}
