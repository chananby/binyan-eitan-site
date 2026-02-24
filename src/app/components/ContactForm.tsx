"use client";

import { useState } from "react";
import { useLang } from "./LangContext";

const copy = {
  he: {
    overline: "יצירת קשר",
    title: "בואו נדבר על הפרויקט הבא שלכם.",
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
    success: "Your message has been received. We will contact you shortly.",
  }
} as const;

export default function ContactForm() {
  const { lang } = useLang();
  const content = copy[lang];
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // כאן בעתיד נחבר את שליחת המייל האמיתית (למשל דרך Formspree או API)
    setSubmitted(true);
  };

  return (
    <section className="bg-bone-dark py-24 md:py-36" id="contact">
      <div className="max-w-[800px] mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 md:mb-24">
          <p className="overline-label mx-auto mb-6">
            <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
            {content.overline}
            <span className="ms-3 inline-block h-px w-6 bg-accent align-middle" />
          </p>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-charcoal">
            {content.title}
          </h2>
        </div>

        {submitted ? (
          <div className="text-center py-12 border border-accent/20 bg-accent/[0.02]">
            <p className="font-body text-lg text-charcoal">{content.success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-10">
              <div className="relative">
                <input type="text" id="name" required className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal placeholder-transparent focus:outline-none focus:border-accent peer transition-colors" placeholder={content.name} />
                <label htmlFor="name" className="absolute start-0 -top-3.5 text-xs font-body font-semibold text-charcoal/50 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent uppercase tracking-widest pointer-events-none">{content.name}</label>
              </div>
              <div className="relative">
                <input type="tel" id="phone" required className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal placeholder-transparent focus:outline-none focus:border-accent peer transition-colors" placeholder={content.phone} />
                <label htmlFor="phone" className="absolute start-0 -top-3.5 text-xs font-body font-semibold text-charcoal/50 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent uppercase tracking-widest pointer-events-none">{content.phone}</label>
              </div>
            </div>
            <div className="relative">
              <input type="email" id="email" required className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal placeholder-transparent focus:outline-none focus:border-accent peer transition-colors" placeholder={content.email} />
              <label htmlFor="email" className="absolute start-0 -top-3.5 text-xs font-body font-semibold text-charcoal/50 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent uppercase tracking-widest pointer-events-none">{content.email}</label>
            </div>
            <div className="relative">
              <textarea id="message" rows={4} required className="w-full bg-transparent border-b border-charcoal/20 py-3 font-body text-charcoal placeholder-transparent focus:outline-none focus:border-accent peer resize-none transition-colors" placeholder={content.message}></textarea>
              <label htmlFor="message" className="absolute start-0 -top-3.5 text-xs font-body font-semibold text-charcoal/50 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-placeholder-shown:font-normal peer-focus:-top-3.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-accent uppercase tracking-widest pointer-events-none">{content.message}</label>
            </div>
            <div className="text-center pt-8">
              <button type="submit" className="group inline-flex items-center justify-center bg-charcoal text-bone px-12 py-5 font-body text-sm font-semibold tracking-[0.2em] uppercase transition-all duration-500 hover:bg-accent hover:shadow-lg hover:shadow-accent/20">
                {content.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
