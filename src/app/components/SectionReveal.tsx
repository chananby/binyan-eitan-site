"use client";

import { motion, useReducedMotion } from "framer-motion";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface SectionRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export default function SectionReveal({
  children,
  delay = 0,
  className = "",
}: SectionRevealProps) {
  // Honour the OS-level "Reduce motion" preference — JS-driven Framer Motion
  // animations bypass the CSS prefers-reduced-motion rule in globals.css, so
  // we have to opt out explicitly. Content still fades in; just no slide.
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: prefersReducedMotion ? 0.25 : 0.75, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
