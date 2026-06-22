"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe, Phone } from "lucide-react";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";

type Lang = "en" | "he";

interface NavLink {
  label: string;
  href: string;
}

// Chanan's number — the single point-of-first-contact across the site.
// Validated against translations.contact.he.chananTel and home.he.phone.
const CHANAN_TEL_E164 = "+972585008447";
const CHANAN_TEL_DIGITS = "972585008447";
const WHATSAPP_PREFILL_HE = "היי חנן, הגעתי דרך האתר ואשמח לשמוע עוד...";
const WHATSAPP_PREFILL_EN = "Hi Chanan, I reached out via the website and would love to learn more...";

// WhatsApp brand glyph — same path used in FloatingWhatsApp, Footer,
// ContactForm, LPTemplate, ArticleDetailPage. Inline so the navbar stays
// dependency-free (lucide-react doesn't ship brand icons).
function WhatsAppGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
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
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusBeforeOpen = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll lock + Esc-to-close + focus return when the overlay opens/closes.
  useEffect(() => {
    if (mobileOpen) {
      lastFocusBeforeOpen.current = (document.activeElement as HTMLElement | null) ?? null;
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileOpen(false);
      };
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", onKey);
        // Return focus to whatever was focused before opening (usually the hamburger).
        const target = lastFocusBeforeOpen.current ?? hamburgerRef.current;
        target?.focus?.();
      };
    }
    document.body.style.overflow = "";
  }, [mobileOpen]);

  const navLinks: NavLink[] = [
    { label: t.home as string, href: `/${lang}` },
    { label: t.about as string, href: `/${lang}/about` },
    { label: t.projects as string, href: `/${lang}/projects` },
    { label: t.expertise as string, href: `/${lang}/expertise` },
    { label: t.faq as string, href: `/${lang}/faq` },
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
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 border-b ${
          scrolled
            ? "bg-bone/[0.96] backdrop-blur-md border-charcoal/[0.10]"
            : "bg-bone border-charcoal/[0.07]"
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

          {/* Trailing: contact buttons (always visible) + lang + hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Phone + WhatsApp — paired CTAs in the brand palette so they
                read as a single contact bar. Identical solid-accent fill (matches
                the site's primary-CTA convention); only the icon differentiates. */}
            <a
              href={`tel:${CHANAN_TEL_E164}`}
              aria-label={lang === "he" ? "התקשרו אלינו" : "Call us"}
              className="grid size-11 place-items-center bg-accent text-bone hover:bg-accent-dark transition-colors duration-200"
            >
              <Phone size={17} strokeWidth={1.7} />
            </a>

            <a
              href={`https://wa.me/${CHANAN_TEL_DIGITS}?text=${encodeURIComponent(
                lang === "he" ? WHATSAPP_PREFILL_HE : WHATSAPP_PREFILL_EN
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="grid size-11 place-items-center bg-accent text-bone hover:bg-accent-dark transition-colors duration-200"
            >
              <WhatsAppGlyph size={18} />
            </a>

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
              ref={hamburgerRef}
              onClick={() => setMobileOpen((v) => !v)}
              className="relative z-[60] grid size-10 place-items-center md:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-overlay"
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
            id="mobile-nav-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={lang === "he" ? "תפריט ניווט" : "Navigation menu"}
            dir={dir}
            className="fixed inset-0 z-[100] flex flex-col bg-bone md:hidden"
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
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-charcoal/65 hover:text-accent transition-colors"
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
                <a
                  href={`https://wa.me/${CHANAN_TEL_DIGITS}?text=${encodeURIComponent(
                    lang === "he" ? WHATSAPP_PREFILL_HE : WHATSAPP_PREFILL_EN
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="text-charcoal/40 hover:text-accent transition-colors"
                >
                  <WhatsAppGlyph size={20} />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
