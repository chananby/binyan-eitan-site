"use client";

/**
 * Text — semantic text primitive built on the readability tokens.
 * Picks the size + colour so the call site never has to: a "content"
 * line always reads at 15px / charcoal, a "muted" line stays at 80%
 * (still passes WCAG AA), a "caption" tag fits 14px for compact rows.
 *
 * Use this instead of `<p className="text-xs text-charcoal/65">` in
 * every new piece of UI. Existing call sites can migrate ad hoc.
 *
 *   <Text>worker name</Text>                  → 15px / full charcoal
 *   <Text variant="muted">project</Text>      → 15px / charcoal/80   (AA)
 *   <Text variant="caption">timestamp</Text>  → 14px / full charcoal
 *   <Text variant="label">שם פרויקט</Text>    → 14px / charcoal/80 (for form labels)
 *
 * The `as` prop lets the same component swap the tag without losing
 * its style — useful inside flex rows where <span> is the right
 * element semantically.
 */

import { type ElementType, type HTMLAttributes } from "react";

export type TextVariant = "content" | "muted" | "caption" | "label";

interface Props extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  variant?: TextVariant;
  /** Override the rendered element. Defaults to <p> for content/muted
   *  and <span> for caption/label. */
  as?: ElementType;
  className?: string;
  children: React.ReactNode;
}

const VARIANT_CLASS: Record<TextVariant, string> = {
  content: "text-content text-charcoal",
  muted:   "text-content text-charcoal/80",
  caption: "text-caption text-charcoal",
  label:   "text-caption text-charcoal/80 font-semibold",
};

const DEFAULT_TAG: Record<TextVariant, ElementType> = {
  content: "p",
  muted:   "p",
  caption: "span",
  label:   "label",
};

export default function Text({ variant = "content", as, className, children, ...rest }: Props) {
  const Tag: ElementType = as ?? DEFAULT_TAG[variant];
  const cls = className ? `${VARIANT_CLASS[variant]} ${className}` : VARIANT_CLASS[variant];
  return <Tag className={cls} {...rest}>{children}</Tag>;
}
