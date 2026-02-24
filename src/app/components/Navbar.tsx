"use client";
 
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe } from "lucide-react";
import { useLang } from "./LangContext";
 
const nav = {
  he: {
    links: [
      { label: "תיק עבודות", href: "/he#portfolio" },
      { label: "המשרד", href: "/he/about" },
      { label: "פנייה", href: "/he#contact" },
    ],
    switchLabel: "EN",
    switchHref: "/en",
  },
  en: {
    links: [
      { label: "Portfolio", href: "/en#portfolio" },
      { label: "The Firm", href: "/en/about" },
      { label: "Inquiry", href: "/en#contact" },
    ],
    switchLabel: "עב",
    switchHref: "/he",
  },
} as const;
 
export default function Navbar() {
  const { lang } = useLang();
  const { links, switchLabel, switchHref } = nav[lang];
 
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
 
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
 
  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);
 
  return (
    <>
      {/* ── Desktop / Sticky Bar ── */}
      <motion.header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled ? "glass" : "bg-transparent"
        }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 lg:px-12">
          {/* Logo — leading side */}
          <Link href={`/${lang}`} className="relative z-10 shrink-0">
            <Image
              src="/logo.png"
              alt="Binyan Eitan"
              width={140}
              height={40}
              className="h-8 w-auto lg:h-10"
              priority
            />
          </Link>
 
          {/* Desktop links — center */}
          <ul className="hidden items-center gap-10 md:flex">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group relative font-body text-sm font-medium tracking-wide uppercase text-charcoal/80 transition-colors hover:text-charcoal"
                >
                  {link.label}
                  <span className="absolute inset-x-0 -bottom-1 h-px origin-[inline-start] scale-x-0 bg-accent transition-transform duration-300 ease-[var(--ease-expo)] group-hover:scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
 
          {/* Trailing — language switcher + mobile toggle */}
          <div className="flex items-center gap-4">
            <Link
              href={switchHref}
              className="flex items-center gap-1.5 rounded-full border border-charcoal/10 px-3.5 py-1.5 text-xs font-semibold tracking-wider uppercase text-charcoal/70 transition-all duration-300 hover:border-accent hover:text-accent"
            >
              <Globe size={14} strokeWidth={1.5} />
              {switchLabel}
            </Link>
 
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="relative z-[60] grid size-10 place-items-center md:hidden"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={24} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={24} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </motion.header>
 
      {/* ── Mobile Fullscreen Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
         <motion.div
            className="fixed inset-0 z-50 flex flex-col items-start justify-center bg-bone px-8 md:hidden"
            initial={{ clipPath: lang === 'he' ? "circle(0% at 44px 36px)" : "circle(0% at calc(100% - 44px) 36px)" }}
            animate={{ clipPath: lang === 'he' ? "circle(150% at 44px 36px)" : "circle(150% at calc(100% - 44px) 36px)" }}
            exit={{ clipPath: lang === 'he' ? "circle(0% at 44px 36px)" : "circle(0% at calc(100% - 44px) 36px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <ul className="flex flex-col gap-8">
              {links.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: lang === "he" ? 40 : -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.15 + i * 0.08,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="font-heading text-5xl font-bold text-charcoal"
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
 
            {/* Language switcher inside mobile menu */}
            <motion.div
              className="mt-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.4 }}
            >
              <Link
                href={switchHref}
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center gap-2 border-b border-charcoal/20 pb-1 text-sm font-medium tracking-widest uppercase text-charcoal/60"
              >
                <Globe size={16} strokeWidth={1.5} />
                {switchLabel}
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
