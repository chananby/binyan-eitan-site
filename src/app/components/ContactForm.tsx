"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";

type Lang = "en" | "he";

// Formspree legacy endpoint — works without an account.
// To upgrade: create a form at formspree.io, then replace with:
//   https://formspree.io/f/<YOUR_FORM_ID>
// The email must be verified via the confirmation Formspree sends to office@binyaneitan.com.
const FORMSPREE_URL = "https://formspree.io/office@binyaneitan.com";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const { lang } = useLang() as { lang: Lang };
  const content = useTranslations("contact", lang);
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        body: new FormData(e.currentTarget),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const body = await res.json().catch(() => ({}));
        console.error("[ContactForm] Formspree error", res.status, body);
        setStatus("error");
      }
    } catch (err) {
      console.error("[ContactForm] Network error", err);
      setStatus("error");
    }
  }

  return (
    <section className="bg-bone-dark py-24 md:py-32" id="contact">
      <div className="max-w-[800px] mx-auto px-6 lg:px-12">
        <div className="text-center mb-10 md:mb-14">
          <p className="overline-label mx-auto mb-6">
            <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
            {content.overline}
            <span className="ms-3 inline-block h-px w-6 bg-accent align-middle" />
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold leading-snug text-charcoal">
            {content.title}
          </h2>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-5 py-16 border border-accent/20 bg-accent/[0.02] text-center">
            <CheckCircle size={40} strokeWidth={1.5} className="text-accent" />
            <div>
              <p className="font-heading text-xl font-bold text-charcoal">{content.success}</p>
              <p className="mt-2 font-body text-sm text-charcoal/50">{content.successSub}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} method="post" className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-10">
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal text-start focus:outline-none focus:border-accent peer transition-colors"
                  placeholder=" "
                />
                <label
                  htmlFor="name"
                  className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/50 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none"
                >
                  {content.name}
                </label>
              </div>
              <div className="relative">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal text-start focus:outline-none focus:border-accent peer transition-colors"
                  placeholder=" "
                />
                <label
                  htmlFor="phone"
                  className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/50 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none"
                >
                  {content.phone}
                </label>
              </div>
            </div>

            <div className="relative">
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal text-start focus:outline-none focus:border-accent peer transition-colors"
                placeholder=" "
              />
              <label
                htmlFor="email"
                className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/50 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none"
              >
                {content.email}
              </label>
            </div>

            <div className="relative">
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal text-start focus:outline-none focus:border-accent peer resize-none transition-colors"
                placeholder=" "
              />
              <label
                htmlFor="message"
                className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/50 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none"
              >
                {content.message}
              </label>
            </div>

            {status === "error" && (
              <p className="font-body text-sm text-red-500 text-center">{content.error}</p>
            )}

            <div className="pt-8">
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full block bg-accent text-bone py-5 font-body text-sm font-semibold tracking-[0.2em] uppercase transition-colors duration-300 hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "sending" ? content.sending : content.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
