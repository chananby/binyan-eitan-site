"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────────────────────
   CONSTANTS & DATA (Hebrew Version)
   ───────────────────────────────────────────── */

const C = {
  bg: "#ffffff",
  bgWarm: "#f9f7f2",
  text: "#1a1a1a",
  textLight: "#666666",
  textMuted: "#888888",
  textFaint: "#aaaaaa",
  amber: "#c5a35d",
  border: "rgba(0,0,0,0.06)",
};

const PROJECTS = [
  {
    title: "רמת אשכול",
    subtitle: "טרנספורמציה מלאה של וילה",
    image: "/ramat-eshkol.jpg",
    images: ["/ramat-eshkol.jpg", ...Array.from({ length: 10 }, (_, i) => `/ramat-eshkol-penthouse-${i + 1}.jpg`)],
    category: "מגורים",
    year: "2024",
  },
  {
    title: "בית וגן",
    subtitle: "הרחבת מבנה ועיצוב פנים יוקרתי",
    image: "/bayit-vegan.jpg",
    images: ["/bayit-vegan.jpg", ...Array.from({ length: 19 }, (_, i) => `/bayit-vegan-${i + 1}.jpg`)],
    category: "תוספות בנייה",
    year: "2024",
  },
  {
    title: "אמשינוב",
    subtitle: "שימור ושיפוץ מבנה היסטורי",
    image: "/amshinov.jpg",
    images: ["/amshinov.jpg", ...Array.from({ length: 23 }, (_, i) => `/amshinov-${i + 1}.jpg`)],
    category: "שימור",
    year: "2023",
  },
  {
    title: "אוהל אבשלום",
    subtitle: "ביצוע הנדסי וגמרים מתקדמים",
    image: "/ohel-avshalom.jpg",
    images: ["/ohel-avshalom.jpg", ...Array.from({ length: 15 }, (_, i) => `/ohel-avshalom-${i + 1}.jpg`)],
    category: "הנדסה",
    year: "2023",
  },
];

const PROCESS = [
  { title: "תכנון ודיוק הנדסי", desc: "ניתוח מעמיק של תוכניות האדריכלות וההנדסה כדי להבטיח ביצוע ללא סטיות." },
  { title: "בחירת חומרים", desc: "שימוש בחומרי הגלם האיכותיים ביותר, מאבן ירושלמית נבחרת ועד מערכות גמר מתקדמות." },
  { title: "ביצוע קפדני", desc: "ניהול אתר הדוק עם דגש על בטיחות, ניקיון וסטנדרט בנייה אירופאי." },
  { title: "מסירה ואחריות", desc: "מסירת הנכס כשהוא מוכן למגורים, עם ליווי ואחריות מלאה לשקט הנפשי שלכם." }
];

/* ─────────────────────────────────────────────
   ANIMATIONS
   ───────────────────────────────────────────── */

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.1, ease: [0.215, 0.61, 0.355, 1] }
  })
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 1 } }
};

/* ─────────────────────────────────────────────
   COMPONENTS
   ───────────────────────────────────────────── */

function Section({ id, children, className = "", style = {} }: any) {
  return <section id={id} className={`relative overflow-hidden ${className}`} style={style}>{children}</section>;
}

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-black/5" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16 h-20 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-playfair text-xl tracking-tight leading-none">BINYAN EITAN</span>
          <span className="text-[9px] tracking-[0.3em] uppercase mt-1 text-[#c5a35d]">בנייה והנדסה</span>
        </div>
        <div className="hidden md:flex items-center gap-10">
          <a href="#projects" className="text-[12px] uppercase tracking-widest hover:text-[#c5a35d] transition-all">פרויקטים</a>
          <a href="#visionary" className="text-[12px] uppercase tracking-widest hover:text-[#c5a35d] transition-all">אודות</a>
          <a href="#contact" className="text-[12px] uppercase tracking-widest hover:text-[#c5a35d] transition-all">צור קשר</a>
          <a href="/" className="text-[11px] font-medium border border-black/10 px-3 py-1 rounded-sm hover:bg-black hover:text-white transition-all">ENGLISH</a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <Section className="h-screen flex items-center pt-20" style={{ backgroundColor: C.bgWarm }} id="home">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16 w-full grid md:grid-cols-12 gap-10 items-center" dir="rtl">
        <div className="md:col-span-7 z-10 text-right">
          <motion.span variants={fadeIn} initial="initial" animate="animate" className="text-[11px] tracking-[0.4em] uppercase block mb-6 text-[#c5a35d]">ירושלים • סטנדרט בינלאומי</motion.span>
          <motion.h1 variants={fadeUp} custom={1} initial="initial" animate="animate" className="font-playfair text-6xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tighter mb-10 text-[#1a1a1a]">
            בונים חזון <br /> <span className="italic">בדיוק הנדסי</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} initial="initial" animate="animate" className="text-[16px] md:text-[18px] leading-relaxed max-w-xl font-light mb-12 text-[#666666]">
            מומחים בבניית בתי יוקרה, תוספות בנייה מורכבות ופרויקטים הנדסיים עבור המגזר הפרטי והציבורי בירושלים. מחויבות למצוינות משלב השלד ועד לגמר המושלם.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} initial="initial" animate="animate" className="flex items-center gap-8 justify-start">
            <a href="#projects" className="text-[12px] tracking-[0.2em] uppercase border-b border-black pb-2 hover:text-[#c5a35d] hover:border-[#c5a35d] transition-all">לצפייה בפורטפוליו</a>
          </motion.div>
        </div>
      </div>
      <div className="absolute top-0 left-0 w-1/2 h-full hidden md:block">
        <Image src="/ramat-eshkol.jpg" alt="Luxury Build" fill className="object-cover" priority />
      </div>
    </Section>
  );
}

function Portfolio() {
  const [activeProject, setActiveProject] = useState<any>(null);

  return (
    <Section id="projects" className="py-32 bg-white" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        <div className="flex justify-between items-end mb-20">
          <div>
            <span className="text-[11px] tracking-[0.4em] uppercase block mb-4 text-[#c5a35d]">עבודות נבחרות</span>
            <h2 className="font-playfair text-4xl md:text-6xl tracking-tight">פורטפוליו</h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-x-12 gap-y-24">
          {PROJECTS.map((project, idx) => (
            <motion.div key={idx} variants={fadeUp} custom={idx} initial="initial" whileInView="animate" viewport={{ once: true }} className="group cursor-pointer" onClick={() => setActiveProject(project)}>
              <div className="aspect-[16/10] relative overflow-hidden mb-8 bg-[#f9f7f2]">
                <Image src={project.image} alt={project.title} fill className="object-cover transition-transform duration-1000 group-hover:scale-105" />
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-playfair text-2xl mb-2">{project.title}</h3>
                  <p className="text-[13px] font-light text-[#888888]">{project.subtitle}</p>
                </div>
                <span className="text-[10px] tracking-widest uppercase text-[#aaaaaa] mt-2">{project.category}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-white overflow-y-auto px-6 py-20">
            <button onClick={() => setActiveProject(null)} className="fixed top-8 left-8 z-[110] text-[12px] tracking-widest uppercase border-b border-black">סגור [X]</button>
            <div className="max-w-[1200px] mx-auto">
              <div className="text-center mb-20">
                <span className="text-[11px] tracking-[0.4em] uppercase block mb-4 text-[#c5a35d]">{activeProject.category}</span>
                <h2 className="font-playfair text-5xl md:text-7xl mb-6">{activeProject.title}</h2>
                <p className="text-lg font-light text-[#666666]">{activeProject.subtitle}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeProject.images.map((img: string, i: number) => (
                  <div key={i} className={`relative bg-[#f9f7f2] ${i === 0 ? 'md:col-span-2 aspect-[16/9]' : 'aspect-square'}`}>
                    <Image src={img} alt="" fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}

function Visionary() {
  return (
    <Section id="visionary" className="py-32 md:py-48" style={{ backgroundColor: C.bgWarm }} dir="rtl">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16">
        <div className="flex flex-col md:flex-row gap-16 md:gap-24 items-center text-right">
          <motion.div className="w-full md:w-5/12 aspect-[3/4] relative rounded-sm overflow-hidden shadow-xl">
            <Image src="/ramat-eshkol.jpg" alt="מוטי איתן" fill className="object-cover" />
          </motion.div>
          <div className="w-full md:w-7/12">
            <span className="text-[11px] tracking-[0.45em] uppercase block mb-5 text-[#c5a35d]">החזון שמאחורי הבנייה</span>
            <h2 className="font-playfair text-4xl md:text-6xl mb-4 text-[#1a1a1a]">מוטי איתן</h2>
            <div className="text-[13px] tracking-[0.2em] uppercase mb-10 text-[#666666]">מייסד ובעלים</div>
            <div className="space-y-6 text-[17px] leading-relaxed font-light text-[#888888]">
              <p>עם למעלה מ-25 שנות ניסיון בהובלת פרויקטים מורכבים במגזר היוקרה בירושלים, מוטי איתן מביא עמו מומחיות הנדסית נדירה ועין בלתי מתפשרת לאיכות.</p>
              <p>בניית אמון היא היסוד החשוב ביותר בכל פרויקט של "בנין איתן". בין אם מדובר בשימור מורשת עבור מוסדות ציבור כמו קרן למורשת הכותל או בבניית בית פרטי, הליווי האישי והשקיפות המלאה הם המצפן שלנו.</p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Contact() {
  const [formState, setFormState] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("access_key", "4f934f99-bd06-4f7d-b552-7355cd127598");
    formData.append("name", formState.name);
    formData.append("email", formState.email);
    formData.append("phone", formState.phone);
    formData.append("message", formState.message);
    const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });
    if (res.ok) setSubmitted(true);
  };

  return (
    <Section id="contact" className="py-32 bg-white" dir="rtl">
      <div className="max-w-[1440px] mx-auto px-8 md:px-16 grid md:grid-cols-2 gap-20">
        <div className="text-right">
          <span className="text-[11px] tracking-[0.45em] uppercase block mb-5 text-[#c5a35d]">צור קשר</span>
          <h2 className="font-playfair text-4xl md:text-6xl mb-10 leading-tight">בואו נבנה <br />ביחד</h2>
          <div className="space-y-4 text-[15px] font-light">
            <p>טלפון: 058-500-8447</p>
            <p>משרד: 02-500-0447</p>
            <p>אימייל: office@binyaneitan.com</p>
          </div>
        </div>
        <div>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="text" placeholder="שם מלא" required className="w-full border-b border-black/10 py-4 outline-none focus:border-[#c5a35d] transition-all" onChange={e => setFormState({...formState, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-6">
                <input type="email" placeholder="אימייל" required className="w-full border-b border-black/10 py-4 outline-none focus:border-[#c5a35d] transition-all" onChange={e => setFormState({...formState, email: e.target.value})} />
                <input type="tel" placeholder="טלפון" required className="w-full border-b border-black/10 py-4 outline-none focus:border-[#c5a35d] transition-all" onChange={e => setFormState({...formState, phone: e.target.value})} />
              </div>
              <textarea placeholder="ספרו לנו על הפרויקט שלכם..." rows={4} className="w-full border-b border-black/10 py-4 outline-none focus:border-[#c5a35d] transition-all resize-none" onChange={e => setFormState({...formState, message: e.target.value})}></textarea>
              <button type="submit" className="w-full bg-[#1a1a1a] text-white py-5 text-[12px] tracking-[0.2em] uppercase hover:bg-[#c5a35d] transition-all">שלח פנייה</button>
            </form>
          ) : (
            <div className="h-full flex items-center justify-center border border-[#c5a35d]/20 p-20 text-center">
              <div>
                <h3 className="font-playfair text-2xl mb-4">תודה רבה</h3>
                <p className="text-sm font-light text-[#888888]">פנייתכם התקבלה, נחזור אליכם בהקדם.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function WhatsAppFloat() {
  return (
    <a href="https://wa.me/972585008447" target="_blank" rel="noopener noreferrer" className="fixed bottom-8 left-8 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform">
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    </a>
  );
}

export default function HebrewPage() {
  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <Hero />
      <div className="py-24 bg-white border-y border-black/5" dir="rtl">
        <div className="max-w-[1440px] mx-auto px-8 md:px-16 grid grid-cols-2 md:grid-cols-4 gap-12">
          {PROCESS.map((p, i) => (
            <div key={i} className="text-right">
              <span className="text-[10px] text-[#c5a35d] mb-2 block uppercase tracking-widest">שלב 0{i+1}</span>
              <h4 className="font-playfair text-lg mb-2">{p.title}</h4>
              <p className="text-xs font-light text-[#888888] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <Portfolio />
      <Visionary />
      <Contact />
      <WhatsAppFloat />
      <footer className="py-12 bg-white border-t border-black/5 text-center">
        <p className="text-[9px] tracking-[0.4em] uppercase text-[#aaaaaa]">© 2026 BINYAN EITAN. ALL RIGHTS RESERVED.</p>
      </footer>
    </main>
  );
}
