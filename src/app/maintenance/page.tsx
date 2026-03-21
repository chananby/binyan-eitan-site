import Image from "next/image";

export const metadata = { title: "האתר בתחזוקה | Binyan Eitan", robots: { index: false, follow: false } };

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#2D2926] flex flex-col items-center justify-center px-6 text-center" dir="rtl">
      <div className="max-w-md space-y-8">

        {/* Logo */}
        <div className="flex justify-center opacity-60">
          <Image src="/logo.png" alt="Binyan Eitan" width={140} height={40} className="h-10 w-auto brightness-0 invert" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/20 text-xs">⚙</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="font-heading text-2xl font-bold text-white/80 leading-snug">
            האתר בתחזוקה זמנית
          </h1>
          <p className="font-body text-sm text-white/40 leading-relaxed">
            אנחנו מבצעים עדכונים למערכת. נחזור בקרוב.
            <br />
            <span dir="ltr" className="text-white/25">The site is under maintenance. We&apos;ll be back shortly.</span>
          </p>
        </div>

        {/* G1 badge */}
        <div className="inline-flex items-center gap-2 border border-[#8D775F]/30 px-4 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8D775F]/60 shrink-0" />
          <span className="font-body text-[0.62rem] font-semibold tracking-[0.18em] uppercase text-[#8D775F]/70">
            Registered Contractor G1 · License #41805
          </span>
        </div>

        {/* Contact */}
        <p className="font-body text-xs text-white/20">
          לפניות דחופות:{" "}
          <a href="tel:+972585008447" className="text-white/35 hover:text-[#8D775F] transition-colors">
            058-500-8447
          </a>
        </p>

      </div>
    </div>
  );
}
