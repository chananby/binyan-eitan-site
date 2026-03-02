"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe, Phone, MessageCircle } from "lucide-react";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";

type Lang = "en" | "he";

interface NavLink {
  label: string;
  href: string;
}

export default function Navbar() {
  const { lang } = useLang() as { lang: Lang };
  const t = useTranslations("nav", lang);
  const homeT = useTranslations("home", lang);
  const pathname = usePathname();
  const otherLang = lang === "he" ? "en" : "he";
  const switchHref = pathname.replace(new RegExp(`^/(he|en)`), `/${otherLang}`);
  const dir = lang === "he" ? "rtl" : "ltr";

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navLinks: NavLink[] = [
    { label: t.home as string, href: `/${lang}` },
    { label: t.about as string, href: `/${lang}/about` },
    { label: t.expertise as string, href: `/${lang}/expertise` },
    { label: t.projects as string, href: `/${lang}#portfolio` },
    { label: t.faq as string, href: `/${lang}/expertise#faq` },
  ];

  // Hash-only links are never "active page" indicators
  const isActive = (href: string) => {
    if (href.includes("#")) return false;
    if (href === `/${lang}`) return pathname === `/${lang}`;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ── Sticky Bar ── */}
      <motion.header
        dir={dir}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 backdrop-blur-md border-b ${
          scrolled
            ? "glass border-charcoal/[0.10]"
            : "bg-bone/92 border-charcoal/[0.07]"
        }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10 lg:py-5">
          {/* Logo */}
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

          {/* Desktop nav links */}
          <ul className="hidden items-center gap-6 md:flex lg:gap-8">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`group relative font-body text-[13px] font-medium tracking-wide uppercase transition-colors duration-200 ${
                      active
                        ? "text-accent"
                        : "text-charcoal/70 hover:text-charcoal"
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute inset-x-0 -bottom-1 h-px bg-accent transition-transform duration-300 ease-[var(--ease-expo)] origin-[inline-start] ${
                        active
                          ? "scale-x-100"
                          : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Trailing: CTA button + lang + hamburger */}
          <div className="flex items-center gap-3">
            {/* Contact CTA — desktop only */}
            <Link
              href={`/${lang}#contact`}
              className="hidden md:inline-flex items-center bg-accent text-bone px-5 py-2 text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors duration-300 hover:bg-accent-dark"
            >
              {t.contact as string}
            </Link>

            {/* Language switcher */}
            <Link
              href={switchHref}
              className="flex items-center gap-1.5 rounded-full border border-charcoal/15 px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-charcoal/60 transition-all duration-300 hover:border-accent hover:text-accent"
            >
              <Globe size={13} strokeWidth={1.5} />
              {t.switchLabel}
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
                    <X size={22} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={22} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </motion.header>

      {/* ── Mobile Full-Screen Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            dir={dir}
            className="fixed inset-0 z-50 flex flex-col bg-bone md:hidden"
            initial={{ opacity: 0, y: "-4%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-4%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-warm-gray-light shrink-0">
              <Link href={`/${lang}`} onClick={() => setMobileOpen(false)}>
                <Image
                  src="/logo.png"
                  alt="Binyan Eitan"
                  width={120}
                  height={36}
                  className="h-8 w-auto"
                />
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="grid size-10 place-items-center text-charcoal/70"
              >
                <X size={22} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 flex flex-col justify-center px-8">
              {[...navLinks, { label: t.contact as string, href: `/${lang}#contact` }].map(
                (link, i) => {
                  const active = isActive(link.href);
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: lang === "he" ? 24 : -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.05 + i * 0.055,
                        duration: 0.38,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between border-b border-warm-gray-light/60 py-5 font-heading text-[1.75rem] font-bold leading-none transition-colors duration-200 ${
                          active
                            ? "text-accent"
                            : "text-charcoal hover:text-accent"
                        }`}
                      >
                        {link.label}
                        {active && (
                          <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-accent" />
                        )}
                      </Link>
                    </motion.div>
                  );
                }
              )}
            </nav>

            {/* Bottom bar: lang + phone + whatsapp */}
            <motion.div
              className="shrink-0 flex items-center justify-between px-8 py-7 border-t border-warm-gray-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.35 }}
            >
              <Link
                href={switchHref}
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-charcoal/50 hover:text-accent transition-colors"
              >
                <Globe size={14} strokeWidth={1.5} />
                {t.switchLabel}
              </Link>

              <div className="flex items-center gap-5">
                {homeT.phone && (
                  <a
                    href={`tel:${(homeT.phone as string).replace(/\s/g, "")}`}
                    aria-label="Call us"
                    className="text-charcoal/40 hover:text-accent transition-colors"
                  >
                    <Phone size={20} strokeWidth={1.5} />
                  </a>
                )}
                {homeT.whatsapp && (
                  <a
                    href={`https://wa.me/${(homeT.whatsapp as string).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="text-charcoal/40 hover:text-accent transition-colors"
                  >
                    <MessageCircle size={20} strokeWidth={1.5} />
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
