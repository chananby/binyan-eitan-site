import React from "react";
import Label from "./Label";

/**
 * Field — labelled form field wrapper. Renders the shared <Label>
 * (text-caption 14px + charcoal/80 + font-semibold) above whatever
 * input the caller passes in.
 *
 * Pre-readability-foundation this rendered `<label className="text-xs
 * text-charcoal/65">`. 12px + 4.4:1 contrast on bone — under the new
 * floor on both axes. Routing every form label through Label here
 * upgrades every screen that uses Field automatically.
 */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
