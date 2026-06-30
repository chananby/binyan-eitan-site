"use client";

/**
 * Label — readability-compliant form label. Replaces inline
 * `<label className="text-xs text-charcoal/65">` invocations that
 * sit just below the WCAG AA threshold both on size (12px) and on
 * contrast (~4.4:1).
 *
 * Uses text-caption (14px) + charcoal/80 + font-semibold so labels
 * read as labels at a glance without competing with the field content
 * below them.
 *
 * The existing <Field> wrapper renders one of these for its label
 * argument; standalone usage is also fine when a form needs more
 * control over layout.
 */

import { type LabelHTMLAttributes } from "react";

interface Props extends Omit<LabelHTMLAttributes<HTMLLabelElement>, "className"> {
  className?: string;
  children: React.ReactNode;
}

export default function Label({ className, children, ...rest }: Props) {
  const cls = "text-caption text-charcoal/80 font-semibold";
  return (
    <label className={className ? `${cls} ${className}` : cls} {...rest}>
      {children}
    </label>
  );
}
