"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────────────────────
   CONSTANTS & DATA
   ───────────────────────────────────────────── */
const C = {
  bg: "#ffffff",
  bgWarm: "#fcfaf7",
  text: "#1a1a1a",
  textLight: "#4a4a4a",
  textMuted: "#888888",
  amber: "#c5a35d",
  border: "rgba(0,0,0,0.08)",
};

const PROJECTS = [
  { 
    title: "רמת אשכול", 
    subtitle: "טרנספורמציה מלאה של וילה ירושלמית", 
    image: "/ramat-eshkol.jpg", 
    alt: "שיפוץ וילה יוקרתית ברמת אשכול ירושלים - בנין איתן הנדסה ובנייה",
    images: ["/ramat-eshkol.jpg", ...Array.from({ length: 10 }, (_, i) => `/ramat-eshkol-penthouse-${i + 1}.jpg`)], 
    category: "בנייה פרטית" 
  },
  { 
    title: "בית וגן", 
    subtitle: "תוספות בנייה וגמרים הנדסיים מורכבים", 
    image: "/bayit-vegan.jpg", 
    alt: "תוספת בנייה ושיפוץ פנים יוקרתי בבית וגן - בנין איתן",
    images: ["/bayit-vegan.jpg", ...Array.from({ length: 19 }, (_, i) => `/bayit-vegan-${i + 1}.jpg`)], 
    category: "מגורי יוקרה" 
  },
  { 
    title: "אמשינוב", 
    subtitle: "שימור ושיפוץ מבנה היסטורי ומוסדי", 
    image: "/amshinov.jpg", 
    alt: "שיפוץ ושימור מבנה היסטורי בירושלים - פרויקט מוסדי בנין איתן",
    images: ["/amshinov.jpg", ...Array.from({ length: 23 }, (_, i) => `/amshinov-${i + 1}.jpg`)], 
    category: "שימור ומוסדות" 
  },
];

/* ─────────────────────────────────────────────
   COMPONENTS
   ───────────────────────────────────────────── */

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 w-full z-[100] bg-white/90 backdrop-blur-md border-b border-black/5 font-sans" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="לוגו בנין איתן" width={32} height={32} className="rounded-sm" />
          <div className="flex flex-col">
            <span className="font-playfair text-base md:text-lg tracking-tight leading-none text-[#1a1a1a]">BINYAN EITAN</span>
            <span className="text-[7px] md:text-[8px] tracking-[0.2em] uppercase mt-1 text-[#c5a35d]">בנייה, שיפוצים והנדסה</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-10">
          <a href="#projects" className="text-[11px] uppercase tracking-widest font-semibold hover:text-[#c5a35d]">פרויקטים</a>
          <a href="#visionary" className="text-[11px] uppercase tracking-widest font-semibold hover:text-[#c5a35d]">אודות</a>
          <a href="#contact" className="text-[11px] uppercase tracking-widest font-semibold hover:text-[#c5a35d]">צור קשר</a>
          <a href="/" className="text-[10px] font-bold border border-black/10 px-2 py-0.5 rounded ml-4 hover:bg-black hover:text-white transition-all">EN</a>
        </div>
        <button className="md:hidden p-2 z-[110]" onClick={() => setIsOpen(!isOpen)}>
          <div className={`w-6 h-0.5 bg-black mb-1.5 transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <div className={`w-6 h-0.5 bg-black mb-1.5 ${isOpen ? 'opacity-0' : ''}`} />
          <div className={`w-6 h-0.5 bg-black transition-all ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 1, x: 100 }} className="fixed inset-0 bg-white z-[105] flex flex-col items-center justify-center gap-8 font-sans">
            <a href="#projects" onClick={()=>setIsOpen(false)} className="text-2xl font-playfair">פרויקטים</a>
            <a href="#visionary" onClick={()=>setIsOpen(false)} className="text-2xl font-playfair">אודות</a>
            <a href="#contact" onClick={()=>setIsOpen(false)} className="text-2xl font-playfair">צור קשר</a>
            <a href="/" className="text-sm border border-black px-6 py-2">ENGLISH VERSION</a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-28 md:pt-20 bg-[#fcfaf7] overflow-hidden" dir="rtl">
      <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;600&display=swap" rel="stylesheet" />
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 w-full grid md:grid-cols-12 gap-8 md:gap-12 items-center">
        <div className="col-span-12 md:col-span-7 z-20 text-right font-sans">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="text-[10px] md:text-[11px] tracking-[0.3em] uppercase block mb-4 md:mb-6 text-[#c5a35d] font-semibold">מאז 1999 • מומחי שיפוץ ובנייה</span>
            <h1 className="font-playfair text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tighter mb-6 md:mb-8 text-[#1a1a1a]">
              בונים מורשת <br className="hidden md:block" /> <span className="italic font-light">בדיוק הנדסי</span>
            </h1>
            <p className="text-[15px] md:text-[19px] leading-relaxed max-w-2xl font-light mb-8 md:mb-10 text-[#4a4a4a]">
              מהאתרים הרגישים ביותר בירושלים ועד לשיפוצי יוקרה מורכבים. 
              <span className="block mt-3 md:mt-4 font-normal text-[#1a1a1a]">
                גוף מבצע עבור הקרן למורשת הכותל ומאות לקוחות פרטיים.
              </span>
            </p>
            <a href="#projects" className="text-[11px] md:text-[12px] tracking-[0.2em] uppercase border-b-2 border-[#c5a35d] pb-2 hover:text-[#c5a35d] transition-all font-bold">צפייה בפרויקטים</a>
          </motion.div>
        </div>
        <div className="col-span-12 md:col-span-5 relative aspect-[16/10] md:aspect-auto md:h-[70vh] overflow-hidden rounded-sm shadow-xl z-10">
          <Image src="/ramat-eshkol.jpg" alt="שיפוץ ובנייה יוקרתית בירושלים על ידי בנין איתן" fill className="object-cover" priority />
        </div>
      </div>
    </section>
  );
}

function GlobalService() {
  const services = [
    {
      title: "ניהול פרויקטים מרחוק",
      desc: "עדכונים שוטפים מכל מקום בעולם עם דוחות יומיים וסיורים מצולמים בוואטסאפ ובזום לשקט נפשי מלא.",
      icon: <svg className="w-8 h-8 mb-4 text-[#c5a35d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    {
      title: "סטנדרט בינלאומי",
      desc: "תכנון הנדסי ורמת גימור העומדים בסטנדרטים הגבוהים ביותר בעולם, מותאמים לצרכים של בעלי נכסים מחו\"ל.",
      icon: <svg className="w-8 h-8 mb-4 text-[#c5a35d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
    },
    {
      title: "שקט נפשי בירוקרטי",
      desc: "אנחנו מטפלים בכל נושאי הרישוי, הבירוקרטיה המקומית וההנדסה המבנית עבורכם, לחוויה נטולת דאגות.",
      icon: <svg className="w-8 h-8 mb-4 text-[#c5a35d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    }
  ];
  return (
    <section className="py-24 bg-white border-b border-black/5 font-sans" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        <div className="grid md:grid-cols-3 gap-16">
          {services.map((s, i) => (
            <div key={i} className="text-right">
              {s.icon}
              <h3 className="font-playfair text-xl mb-3 text-[#1a1a1a]">{s.title}</h3>
              <p className="text-sm font-light text-[#666] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Portfolio() {
  const [activeProject, setActiveProject] = useState<any>(null);
  return (
    <section id="projects" className="py-24 md:py-32 bg-[#fcfaf7] font-sans" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        <div className="mb-16"><span className="text-[11px] tracking-[0.4em] uppercase block mb-4 text-[#c5a35d]">תיק עבודות</span><h2 className="font-playfair text-4xl md:text-6xl text-[#1a1a1a]">פרויקטים נבחרים</h2></div>
        <div className="grid md:grid-cols-3 gap-10">
          {PROJECTS.map((p, idx) => (
            <div key={idx} className="group cursor-pointer" onClick={() => setActiveProject(p)}>
              <div className="aspect-[4/5] relative overflow-hidden mb-6 bg-white">
                <Image src={p.image} alt={p.alt} fill className="object-cover md:grayscale group-hover:grayscale-0 transition-all duration-700" />
              </div>
              <h3 className="font-playfair text-2xl mb-1">{p.title}</h3>
              <p className="text-[13px] text-[#888888] font-light">{p.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {activeProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-white overflow-y-auto p-6 pt-24 font-sans">
            <button onClick={() => setActiveProject(null)} className="fixed top-8 left-8 z-[210] text-[12px] uppercase border-b border-black">סגור [X]</button>
            <div className="max-w-[1200px] mx-auto text-center" dir="rtl">
              <h2 className="font-playfair text-4xl md:text-7xl mb-8">{activeProject.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {activeProject.images.map((img: string, i: number) => (
                  <div key={i} className={`relative bg-[#f9f7f2] ${i === 0 ? 'md:col-span-2 aspect-[16/9]' : 'aspect-square'}`}><Image src={img} alt={activeProject.title} fill className="object-cover" /></div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append("access_key", "4f934f99-bd06-4f7d-b552-7355cd127598");
    const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });
    if (res.ok) setSubmitted(true);
  };
  return (
    <section id="contact" className="py-24 md:py-32 bg-[#1a1a1a] text-white font-sans" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-[11px] tracking-[0.45em] uppercase block mb-6 text-[#c5a35d]">בואו נדבר</span>
          <h2 className="font-playfair text-4xl md:text-7xl mb-8 leading-tight text-white">מתחילים <br />שיפוץ?</h2>
          <div className="space-y-4 text-base md:text-lg"><p>058-500-8447</p><p className="text-xs text-[#555]">office@binyaneitan.com</p></div>
        </div>
        <div className="bg-white p-8 md:p-16 text-black shadow-2xl">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="text" name="name" placeholder="שם מלא" required className="w-full border-b border-black/10 py-3 outline-none focus:border-[#c5a35d] transition-all bg-transparent" />
              <input type="tel" name="phone" placeholder="טלפון" required className="w-full border-b border-black/10 py-3 outline-none focus:border-[#c5a35d] transition-all bg-transparent" />
              <textarea name="message" placeholder="ספרו לנו על הפרויקט..." rows={3} className="w-full border-b border-black/10 py-3 outline-none focus:border-[#c5a35d] transition-all resize-none bg-transparent"></textarea>
              <button type="submit" className="w-full bg-[#1a1a1a] text-white py-5 text-[11px] tracking-[0.2em] uppercase hover:bg-[#c5a35d] transition-all">שלח פנייה</button>
            </form>
          ) : (
            <div className="text-center py-10"><h3 className="font-playfair text-2xl mb-4 text-black">תודה רבה</h3><p>נחזור אליכם בהקדם.</p></div>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const [modal, setModal] = useState<string | null>(null);
  
  return (
    <footer className="py-12 bg-[#1a1a1a] text-center border-t border-white/5 font-sans" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-8 flex flex-col items-center gap-6">
        <p className="text-[9px] tracking-[0.4em] uppercase text-[#555]">© 2026 BINYAN EITAN. ALL RIGHTS RESERVED.</p>
        <div className="flex gap-6 text-[10px] text-gray-500 underline underline-offset-4">
          <button onClick={() => setModal('accessibility')}>הצהרת נגישות</button>
          <button onClick={() => setModal('privacy')}>מדיניות פרטיות</button>
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-6">
            <div className="bg-white p-8 md:p-12 max-w-2xl w-full max-h-[80vh] overflow-y-auto text-right rounded-sm relative">
              <button onClick={() => setModal(null)} className="absolute top-4 left-4 text-black font-bold">X</button>
              {modal === 'accessibility' ? (
                <div>
                  <h2 className="font-playfair text-2xl mb-4">הצהרת נגישות</h2>
                  <p className="text-sm leading-relaxed mb-4">חברת בנין איתן רואה חשיבות עליונה בהנגשת שירותיה לכלל האוכלוסייה. אתר זה הונגש בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות. בוצעו התאמות טכנולוגיות הכוללות ניווט מקלדת, תיאורי תמונות וניגודיות צבעים. אם נתקלתם בבעיה, פנו אלינו למייל: office@binyaneitan.com.</p>
                </div>
              ) : (
                <div>
                  <h2 className="font-playfair text-2xl mb-4">מדיניות פרטיות</h2>
                  <p className="text-sm leading-relaxed">המידע הנאסף בטופס יצירת הקשר (שם, טלפון, מייל) משמש אך ורק למתן מענה לפנייתכם. איננו מעבירים מידע לצד ג' ואיננו עושים שימוש במידע למטרות פרסומיות ללא אישורכם המפורש.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}

export default function HebrewPage() {
  return (
    <main className="bg-white min-h-screen selection:bg-[#c5a35d] selection:text-white">
      <Navbar />
      <Hero />
      <GlobalService />
      <Portfolio />
      <Contact />
      <Footer />
      <a href="https://wa.me/972585008447" target="_blank" className="fixed bottom-6 left-6 z-[90] w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-2xl"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
    </main>
  );
}
