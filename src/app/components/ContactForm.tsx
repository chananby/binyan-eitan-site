"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";
import PrecisionGame from "./PrecisionGame";

type Lang = "en" | "he";

const CONTACT_API = "/api/contact";

const WHATSAPP_HE =
  "https://wa.me/972585008447?text=%D7%94%D7%99%D7%99%20%D7%9E%D7%95%D7%98%D7%99%2C%20%D7%94%D7%92%D7%A2%D7%AA%D7%99%20%D7%93%D7%A8%D7%9A%20%D7%98%D7%95%D7%A4%D7%A1%20%D7%94%D7%A7%D7%A9%D7%A8%20%D7%95%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A9%D7%9E%D7%95%D7%A2%20%D7%A2%D7%95%D7%93...";
const WHATSAPP_EN =
  "https://wa.me/972585008447?text=Hi%20Moti%2C%20I%20tried%20the%20contact%20form%20and%20would%20like%20to%20follow%20up...";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const { lang } = useLang() as { lang: Lang };
  const content = useTranslations("contact", lang);
  const [status, setStatus] = useState<Status>("idle");
  const whatsappUrl = lang === "he" ? WHATSAPP_HE : WHATSAPP_EN;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(CONTACT_API, {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const body = await res.json().catch(() => ({}));
        console.error("[ContactForm] API error", res.status, body);
        setStatus("error");
      }
    } catch (err) {
      console.error("[ContactForm] Network error", err);
      setStatus("error");
    }
  }

  return (
    <section className="scroll-mt-20 bg-bone-dark py-14 md:py-24 lg:py-32" id="contact">
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
          <div>
            <div className="flex flex-col items-center gap-5 py-10 mb-6 border border-accent/20 bg-accent/[0.02] text-center">
              <CheckCircle size={40} strokeWidth={1.5} className="text-accent" />
              <div>
                <p className="font-heading text-xl font-bold text-charcoal">{content.success}</p>
                <p className="mt-2 font-body text-sm text-charcoal/50">{content.successSub}</p>
                <p className="mt-4 font-body text-[0.7rem] text-charcoal/30 tracking-wider">
                  {lang === "he" ? "בינתיים — בדקו את הדיוק שלכם:" : "While you wait — test your precision:"}
                </p>
              </div>
            </div>
            <PrecisionGame compact />
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
              <div className="text-center space-y-4">
                <p className="font-body text-sm text-red-500">{content.error}</p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] px-6 py-2.5 transition-colors duration-200 text-xs font-semibold tracking-[0.14em] uppercase"
                >
                  {lang === "he" ? "שלחו לנו הודעה בוואטסאפ" : "Contact us via WhatsApp"}
                </a>
              </div>
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
