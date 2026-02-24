"use client";

import { useState } from "react";
import { useLang } from "./LangContext";

const copy = {
  he: {
    overline: "יצירת קשר",
    title: "מתחילים לבנות את החזון שלכם. צרו קשר לייעוץ ראשוני.",
    name: "שם מלא",
    phone: "טלפון",
    email: "אימייל",
    message: "ספרו לנו על הפרויקט...",
    submit: "שליחת הודעה",
    success: "הודעתך התקבלה בהצלחה. ניצור קשר בהקדם.",
  },
  en: {
    overline: "Get in Touch",
    title: "Let's discuss your next project.",
    name: "Full Name",
    phone: "Phone Number",
    email: "Email Address",
    message: "Tell us about your project...",
    submit: "Send Message",
    success: "Your message has been received.",
  }
} as const;

export default function ContactForm() {
  const { lang } = useLang();
  const content = copy[lang];
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="bg-bone-dark py-32 md:py-44" id="contact">
      <div className="max-w-[800px] mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 md:mb-24">
          <p className="overline-label mx-auto mb-6">
            <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
            {content.overline}
            <span className="ms-3 inline-block h-px w-6 bg-accent align-middle" />
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold leading-snug text-charcoal">
            {content.title}
          </h2>
        </div>

        {submitted ? (
          <div className="text-center py-12 border border-accent/20 bg-accent/[0.02]">
            <p className="font-body text-lg text-charcoal">{content.success}</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-10">
              <div className="relative">
                <input type="text" id="name" required className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal text-start focus:outline-none focus:border-accent peer transition-colors" placeholder=" " />
                <label htmlFor="name" className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/50 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none">{content.name}</label>
              </div>
              <div className="relative">
                <input type="tel" id="phone" required className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal text-start focus:outline-none focus:border-accent peer transition-colors" placeholder=" " />
                <label htmlFor="phone" className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/50 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none">{content.phone}</label>
              </div>
            </div>
            <div className="relative">
              <input type="email" id="email" required className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal text-start focus:outline-none focus:border-accent peer transition-colors" placeholder=" " />
              <label htmlFor="email" className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/50 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none">{content.email}</label>
            </div>
            <div className="relative">
              <textarea id="message" rows={4} required className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal text-start focus:outline-none focus:border-accent peer resize-none transition-colors" placeholder=" "></textarea>
              <label htmlFor="message" className="absolute start-0 top-3 text-base font-body font-normal text-charcoal/50 transition-all peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent peer-[:not(:placeholder-shown)]:-top-3.5 peer-[:not(:placeholder-shown)]:text-xs uppercase tracking-widest pointer-events-none">{content.message}</label>
            </div>
            <div className="pt-8">
              <button type="submit" className="w-full block bg-charcoal text-bone py-5 font-body text-sm font-semibold tracking-[0.2em] uppercase transition-colors duration-300 hover:bg-charcoal-light">
                {content.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
