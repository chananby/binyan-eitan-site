"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { useLang } from "./LangContext";
import { useTranslations } from "./TranslationsProvider";
type Lang = "en" | "he";

const CONTACT_API = "/api/contact";

// Fallback WhatsApp link surfaced when the form fails — both languages now
// point to Chanan (single point-of-first-contact) with the correct greeting.
const WHATSAPP_HE =
  "https://wa.me/972585008447?text=" +
  encodeURIComponent("היי חנן, ניסיתי דרך טופס הקשר באתר ואשמח לעדכון...");
const WHATSAPP_EN =
  "https://wa.me/972585008447?text=" +
  encodeURIComponent("Hi Chanan, I tried the contact form on the website and would like to follow up...");

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

        {/* Direct contact row */}
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-px bg-charcoal/[0.08]">
          {[
            {
              name: content.chananName,
              role: content.chananRole,
              phone: content.chananPhone,
              tel: content.chananTel,
              wa: `https://wa.me/${content.chananTel?.replace("+", "")}?text=${encodeURIComponent(lang === "he" ? "היי חנן, הגעתי דרך האתר ואשמח לשמוע עוד..." : "Hi Chanan, I reached out via the website and would love to learn more...")}`,
            },
            {
              name: content.samName,
              role: content.samRole,
              phone: content.samPhone,
              tel: content.samTel,
              wa: `https://wa.me/${content.samTel?.replace("+", "")}?text=${encodeURIComponent(lang === "he" ? "היי סם, הגעתי דרך האתר ואשמח לשמוע עוד..." : "Hi Sam, I reached out via the website and would love to learn more...")}`,
            },
          ].map((person) => (
            <div key={person.name} className="bg-bone p-6 flex flex-col gap-2">
              <p className="font-heading text-sm font-bold text-charcoal">{person.name}</p>
              <p className="font-body text-[0.68rem] uppercase tracking-[0.14em] text-charcoal/65">{person.role}</p>
              <div className="flex items-center gap-3 mt-1">
                <a
                  href={`tel:${person.tel}`}
                  className="font-body text-sm text-charcoal/70 hover:text-accent transition-colors duration-200"
                >
                  <bdi>{person.phone}</bdi>
                </a>
                <a
                  href={person.wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] px-3.5 py-2.5 transition-colors duration-200 text-[0.68rem] font-semibold tracking-[0.1em] uppercase"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-5 py-10 border border-accent/20 bg-accent/[0.02] text-center">
            <CheckCircle size={40} strokeWidth={1.5} className="text-accent" />
            <div>
              <p className="font-heading text-xl font-bold text-charcoal">{content.success}</p>
              <p className="mt-2 font-body text-sm text-charcoal/70">{content.successSub}</p>
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
                  className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/65 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none"
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
                  className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/65 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none"
                >
                  {content.phone}
                </label>
              </div>
            </div>

            {/* Email, project_type, location intentionally removed (May 2026)
                to cut form length from 6 to 3 fields. Email lives on the
                /api/contact endpoint as optional; if a need arises we can
                re-introduce a "+ הוסף פרטים" disclosure here. */}

            <div className="relative">
              <textarea
                id="message"
                name="message"
                rows={3}
                className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal text-start focus:outline-none focus:border-accent peer resize-none transition-colors"
                placeholder=" "
              />
              <label
                htmlFor="message"
                className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/65 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none"
              >
                {content.message}
                <span className="ms-1.5 text-charcoal/40 normal-case tracking-normal">
                  ({lang === "he" ? "אופציונלי" : "optional"})
                </span>
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
              <p className="text-center text-xs text-charcoal/70 mb-3">
                {lang === "he"
                  ? "נחזור אליכם תוך שעה — לרוב מהר יותר"
                  : "We'll get back to you within an hour — usually sooner"}
              </p>
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
