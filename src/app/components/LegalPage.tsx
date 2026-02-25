"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLang } from "./LangContext";

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = "terms" | "privacy" | "accessibility";

// ── Copy ──────────────────────────────────────────────────────────────────────

const tabs = {
  en: [
    { id: "terms" as Tab, label: "Terms of Use" },
    { id: "privacy" as Tab, label: "Privacy Policy" },
    { id: "accessibility" as Tab, label: "Accessibility Statement" },
  ],
  he: [
    { id: "terms" as Tab, label: "תנאי שימוש" },
    { id: "privacy" as Tab, label: "מדיניות פרטיות" },
    { id: "accessibility" as Tab, label: "הצהרת נגישות" },
  ],
};

const UPDATED = "פברואר 2026 / February 2026";

// ── Section components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="font-heading text-xl font-bold text-charcoal mb-5 pb-3 border-b border-charcoal/[0.07]">
        {title}
      </h2>
      <div className="space-y-4 font-body text-sm leading-relaxed font-light text-charcoal/70">
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

// ── Tab content ───────────────────────────────────────────────────────────────

function TermsEN() {
  return (
    <>
      <p className="font-body text-xs text-charcoal/40 mb-10">Last updated: {UPDATED}</p>

      <Section title="1. General">
        <P>This website (the "Site") is operated by Binyan Eitan Construction Ltd. ("Binyan Eitan", "we", "us"). By accessing or using the Site, you agree to be bound by these Terms of Use. If you do not agree, please do not use the Site.</P>
      </Section>

      <Section title="2. Purpose of the Site">
        <P>The Site is provided for general informational purposes only. Nothing on the Site constitutes a binding offer, quote, or contract. All project specifications, pricing, timelines, and scopes of work must be agreed upon in a separate, signed written agreement.</P>
      </Section>

      <Section title="3. Intellectual Property">
        <P>All content on this Site — including text, photographs, graphics, logos, and design — is the exclusive property of Binyan Eitan Construction Ltd. and is protected under applicable Israeli and international copyright law. All images displayed on this Site are for illustrative purposes only and do not necessarily represent completed or ongoing projects unless explicitly stated.</P>
        <P>Reproduction, distribution, or use of any content without prior written consent is strictly prohibited.</P>
      </Section>

      <Section title="4. Disclaimer of Warranties">
        <P>The Site and its content are provided "as is" and "as available" without warranties of any kind, express or implied. We make no representations regarding the accuracy, completeness, or suitability of the information for any particular purpose.</P>
      </Section>

      <Section title="5. Limitation of Liability">
        <P>To the fullest extent permitted by law, Binyan Eitan shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of, or inability to use, the Site or its content.</P>
      </Section>

      <Section title="6. External Links">
        <P>The Site may contain links to third-party websites. These are provided for convenience only. Binyan Eitan has no control over such sites and assumes no responsibility for their content or practices.</P>
      </Section>

      <Section title="7. Governing Law & Jurisdiction">
        <P>These Terms are governed by and construed in accordance with the laws of the State of Israel. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the competent courts of Jerusalem.</P>
      </Section>

      <Section title="8. Amendments">
        <P>We reserve the right to update or modify these Terms at any time without prior notice. Continued use of the Site following any changes constitutes acceptance of the updated Terms.</P>
      </Section>

      <Section title="9. Contact">
        <P>For questions regarding these Terms, please contact us at: <a href="mailto:office@binyaneitan.com" className="text-accent hover:underline">office@binyaneitan.com</a></P>
      </Section>
    </>
  );
}

function PrivacyEN() {
  return (
    <>
      <p className="font-body text-xs text-charcoal/40 mb-10">Last updated: {UPDATED}</p>

      <Section title="1. Data Controller">
        <P>Binyan Eitan Construction Ltd., operating from Jerusalem and Lod, Israel, is the data controller for any personal information collected through this Site. Contact: <a href="mailto:office@binyaneitan.com" className="text-accent hover:underline">office@binyaneitan.com</a> | Tel: <a href="tel:+97225000447" className="text-accent hover:underline">02-5000447</a></P>
      </Section>

      <Section title="2. Information We Collect">
        <P>We collect personal information only when you voluntarily submit our contact form. This includes: your full name, phone number, and email address, as well as the content of your message. We do not collect any data passively through tracking technologies or advertising cookies.</P>
      </Section>

      <Section title="3. Purpose of Processing">
        <P>Your contact information is used solely to: (a) respond to your inquiry; (b) follow up on your project request; and (c) maintain communication throughout any engagement. We do not use your information for marketing purposes without your explicit consent.</P>
      </Section>

      <Section title="4. Sharing of Data">
        <P>We do not sell, rent, or share your personal data with third parties, except as required by law or with service providers directly involved in processing your inquiry. Our contact form is processed by Formspree, Inc. — their privacy policy is available at formspree.io/legal/privacy-policy.</P>
      </Section>

      <Section title="5. Data Retention">
        <P>We retain contact information for a period of seven (7) years as required under applicable Israeli commercial and tax law, or until you request deletion, whichever is earlier.</P>
      </Section>

      <Section title="6. Your Rights">
        <P>Under the Israeli Privacy Protection Law, 5741-1981 (as amended), you have the right to: access personal data we hold about you; correct inaccurate data; and request deletion of your data where legally permissible. To exercise these rights, contact us at <a href="mailto:office@binyaneitan.com" className="text-accent hover:underline">office@binyaneitan.com</a>.</P>
      </Section>

      <Section title="7. Security">
        <P>We implement reasonable technical and organizational measures to protect your personal data against unauthorized access, loss, or disclosure. However, no method of transmission over the internet is completely secure.</P>
      </Section>

      <Section title="8. Cookies">
        <P>This Site does not use tracking, analytics, or advertising cookies. We may use essential session-level cookies required for basic Site functionality. These are not used to identify you personally.</P>
      </Section>

      <Section title="9. Amendments">
        <P>We may update this Privacy Policy periodically. Material changes will be noted by updating the "Last updated" date at the top of this page.</P>
      </Section>
    </>
  );
}

function AccessibilityEN() {
  return (
    <>
      <p className="font-body text-xs text-charcoal/40 mb-10">Date of Statement: {UPDATED}</p>

      <Section title="Our Commitment">
        <P>Binyan Eitan Construction Ltd. is committed to making its digital presence accessible to all users, including people with disabilities. We believe that equal access to information is a fundamental right, and we strive to ensure our Site complies with the requirements of the Israeli Equal Rights for Persons with Disabilities Law, 5758-1998, and Amendment No. 2 thereof, which mandates accessibility for publicly accessible services.</P>
      </Section>

      <Section title="Applicable Standard">
        <P>Our accessibility efforts are guided by Israeli Standard SI 5568, which is based on the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA. We are actively working toward full conformance with this standard.</P>
      </Section>

      <Section title="Measures Implemented">
        <P>The following accessibility features have been implemented on this Site:</P>
        <ul className="list-disc ps-5 space-y-1.5 mt-3">
          <li>Semantic HTML5 structure to support screen reader compatibility</li>
          <li>Logical, sequential reading and tab order</li>
          <li>Descriptive alt text for informational images</li>
          <li>Sufficient color contrast ratios throughout the interface</li>
          <li>Text sizing support — all text scales correctly when browser font size is adjusted</li>
          <li>Keyboard-navigable interactive elements (menus, forms, lightbox)</li>
          <li>Focus indicators on all interactive elements</li>
          <li>On-site Accessibility Menu (floating widget) for high-contrast mode and font scaling</li>
          <li>RTL/LTR language support for Hebrew and English users</li>
        </ul>
      </Section>

      <Section title="Known Limitations">
        <P>Some portfolio images may have limited descriptive alt text. We are actively working to improve the descriptiveness of all image alternative text. PDF documents, if any, may not be fully accessible.</P>
      </Section>

      <Section title="Accessibility Coordinator">
        <P>If you encounter any accessibility barriers on this Site, or if you require content in an alternative format, please contact our accessibility coordinator:</P>
        <div className="mt-4 p-5 border border-charcoal/10 bg-bone-dark text-start">
          <p className="font-heading font-bold text-charcoal text-base mb-1">Moti Eitan</p>
          <p className="text-charcoal/50 text-xs mb-3">Accessibility Coordinator, Binyan Eitan Construction Ltd.</p>
          <p>Email: <a href="mailto:office@binyaneitan.com" className="text-accent hover:underline">office@binyaneitan.com</a></p>
          <p>Phone: <a href="tel:+97225000447" className="text-accent hover:underline">02-5000447</a></p>
        </div>
        <P>We aim to respond to accessibility inquiries within 5 business days.</P>
      </Section>

      <Section title="Feedback">
        <P>We welcome all feedback regarding the accessibility of our Site. Your input helps us improve. Please do not hesitate to contact us if you experience any difficulty.</P>
      </Section>
    </>
  );
}

// ── Hebrew content ────────────────────────────────────────────────────────────

function TermsHE() {
  return (
    <>
      <p className="font-body text-xs text-charcoal/40 mb-10">עודכן לאחרונה: {UPDATED}</p>

      <Section title="1. כללי">
        <P>אתר זה ("האתר") מופעל על-ידי חברת בנין איתן בע"מ ("בנין איתן", "אנחנו"). כניסתך לאתר ושימושך בו מהווים הסכמה לתנאי שימוש אלו. אם אינך מסכים לתנאים, אנא אל תעשה שימוש באתר.</P>
      </Section>

      <Section title="2. מטרת האתר">
        <P>האתר מסופק למטרות מידע כלליות בלבד. שום דבר באתר אינו מהווה הצעה מחייבת, הצעת מחיר או חוזה. כל מפרטי הפרויקט, התמחור, לוחות הזמנים והיקפי העבודה חייבים להיות מוסכמים בהסכם כתוב ונפרד שנחתם על-ידי הצדדים.</P>
      </Section>

      <Section title="3. קניין רוחני">
        <P>כל התוכן באתר זה — לרבות טקסט, תצלומים, גרפיקה, לוגואים ועיצוב — הינו רכושה הבלעדי של חברת בנין איתן בע"מ ומוגן בהתאם לחוק זכויות יוצרים תשס"ח-2007 ולדיני קניין רוחני הרלוונטיים. כל התמונות המוצגות באתר הן לצרכי המחשה בלבד ואינן מייצגות בהכרח פרויקטים שהושלמו, אלא אם צוין אחרת.</P>
        <P>שכפול, הפצה או שימוש בכל תוכן ללא אישור מפורש בכתב אסורים בהחלט.</P>
      </Section>

      <Section title="4. הגבלת אחריות">
        <P>האתר ותכניו מסופקים כפי שהם ("as is"), ללא אחריות מכל סוג שהוא, מפורשת או משתמעת. אין אנו מתחייבים לדיוק, שלמות או התאמה של המידע לכל מטרה ספציפית.</P>
        <P>בנין איתן לא תהיה אחראית לכל נזק עקיף, מקרי, מיוחד או תוצאתי הנובע מהשימוש באתר.</P>
      </Section>

      <Section title="5. הדין החל וסמכות שיפוט">
        <P>תנאי שימוש אלו כפופים לדיני מדינת ישראל. כל מחלוקת הנובעת מתנאים אלו תהיה בסמכות שיפוט ייחודית של בתי המשפט המוסמכים בירושלים.</P>
      </Section>

      <Section title="6. שינויים">
        <P>אנו שומרים לעצמנו את הזכות לעדכן תנאים אלו בכל עת ללא הודעה מוקדמת. המשך שימוש באתר לאחר שינויים כלשהם מהווה הסכמה לתנאים המעודכנים.</P>
      </Section>

      <Section title="7. צור קשר">
        <P>לשאלות בנוגע לתנאים אלו, פנה אלינו בכתובת: <a href="mailto:office@binyaneitan.com" className="text-accent hover:underline">office@binyaneitan.com</a></P>
      </Section>
    </>
  );
}

function PrivacyHE() {
  return (
    <>
      <p className="font-body text-xs text-charcoal/40 mb-10">עודכן לאחרונה: {UPDATED}</p>

      <Section title="1. בעל המידע">
        <P>חברת בנין איתן בע"מ, הפועלת מירושלים ולוד, היא בעל המידע לכל מידע אישי הנאסף דרך אתר זה. ניתן ליצור קשר בכתובת: <a href="mailto:office@binyaneitan.com" className="text-accent hover:underline">office@binyaneitan.com</a> | טל&#39;: <a href="tel:+97225000447" className="text-accent hover:underline">02-5000447</a></P>
      </Section>

      <Section title="2. מידע הנאסף">
        <P>אנו אוספים מידע אישי אך ורק כאשר אתה מגיש את טופס יצירת הקשר שלנו מרצונך החופשי. מידע זה כולל: שם מלא, מספר טלפון וכתובת דוא"ל, וכן תוכן הפנייה. אין אנו אוספים מידע באופן פסיבי באמצעות עוגיות מעקב או טכנולוגיות פרסום.</P>
      </Section>

      <Section title="3. מטרת העיבוד">
        <P>פרטי הקשר שלך ישמשו אך ורק למטרות הבאות: (א) מענה לפנייתך; (ב) מעקב אחר בקשת הפרויקט שלך; (ג) שמירה על תקשורת לאורך כל ההתקשרות. לא נשתמש במידעך לצרכי שיווק ללא הסכמתך המפורשת.</P>
      </Section>

      <Section title="4. שיתוף מידע">
        <P>אין אנו מוכרים, משכירים או מעבירים את נתוניך האישיים לצדדים שלישיים, למעט כנדרש על-פי חוק או עם ספקי שירות המעורבים ישירות בטיפול בפנייתך. טופס יצירת הקשר מעובד על-ידי Formspree, Inc. — מדיניות הפרטיות שלהם זמינה בכתובת formspree.io/legal/privacy-policy.</P>
      </Section>

      <Section title="5. שמירת מידע">
        <P>אנו שומרים את פרטי הקשר לתקופה של שבע (7) שנים כנדרש על-פי הדין הישראלי החל בתחום המסחרי ודיני המס, או עד למועד בקשת המחיקה שלך, לפי המוקדם מביניהם.</P>
      </Section>

      <Section title="6. זכויותיך">
        <P>בהתאם לחוק הגנת הפרטיות, תשמ"א-1981 ותיקוניו, יש לך זכות לעיין במידע האישי שאנו מחזיקים עליך, לתקן מידע שגוי ולבקש מחיקת המידע שלך ככל שהדבר מותר על-פי דין. לממוש זכויות אלו, פנה אלינו בכתובת <a href="mailto:office@binyaneitan.com" className="text-accent hover:underline">office@binyaneitan.com</a>.</P>
      </Section>

      <Section title="7. אבטחת מידע">
        <P>אנו מיישמים אמצעי הגנה טכניים וארגוניים סבירים להגנה על נתוניך האישיים מפני גישה בלתי מורשית, אובדן או חשיפה.</P>
      </Section>

      <Section title="8. עוגיות">
        <P>אתר זה אינו משתמש בעוגיות מעקב, ניתוח נתונים או פרסום. ייתכן שנשתמש בעוגיות הכרחיות ברמת הסשן הנדרשות לפונקציונליות בסיסית של האתר. עוגיות אלו אינן משמשות לזיהויך אישי.</P>
      </Section>
    </>
  );
}

function AccessibilityHE() {
  return (
    <>
      <p className="font-body text-xs text-charcoal/40 mb-10">תאריך הצהרה: {UPDATED}</p>

      <Section title="מחויבותנו לנגישות">
        <P>חברת בנין איתן בע"מ מחויבת להנגיש את נוכחותה הדיגיטלית לכלל המשתמשים, לרבות אנשים עם מוגבלויות. אנו מאמינים כי גישה שווה למידע הינה זכות יסוד, ושואפים להבטיח שהאתר עומד בדרישות חוק שוויון זכויות לאנשים עם מוגבלות, תשנ"ח-1998 ותיקון מס' 2 לו, המחייב נגישות לשירותים הפתוחים לציבור.</P>
      </Section>

      <Section title="התקן החל">
        <P>מאמצי הנגישות שלנו מונחים על-פי תקן ישראלי 5568 (ת"י 5568), המבוסס על הנחיות לנגישות תוכן אינטרנט WCAG 2.1 ברמה AA. אנו עובדים באופן פעיל להשגת עמידה מלאה בתקן זה.</P>
      </Section>

      <Section title="תכונות נגישות שיושמו">
        <P>תכונות הנגישות הבאות יושמו באתר:</P>
        <ul className="list-disc ps-5 space-y-1.5 mt-3">
          <li>מבנה HTML5 סמנטי לתאימות עם קוראי מסך</li>
          <li>סדר קריאה וניווט לשוניות הגיוני ועקבי</li>
          <li>טקסט חלופי תיאורי לתמונות אינפורמטיביות</li>
          <li>יחסי ניגודיות צבעים מספקים בממשק</li>
          <li>תמיכה בהגדלת טקסט — כל הטקסט משתנה בהתאם לגודל הגופן שנבחר בדפדפן</li>
          <li>ניווט מקלדת לכל הרכיבים האינטראקטיביים</li>
          <li>מחוון מיקוד ויזואלי על כל הרכיבים האינטראקטיביים</li>
          <li>תפריט נגישות מובנה (ווידג'ט צף) לניגודיות גבוהה והגדלת גופן</li>
          <li>תמיכה בכיווניות RTL/LTR עבור משתמשי עברית ואנגלית</li>
        </ul>
      </Section>

      <Section title="מגבלות ידועות">
        <P>לחלק מתמונות תיק העבודות עשוי להיות טקסט חלופי מוגבל. אנו עובדים באופן פעיל לשיפור תיאוריות התמונות. מסמכי PDF, אם קיימים, עשויים שלא להיות נגישים במלואם.</P>
      </Section>

      <Section title="רכז הנגישות">
        <P>אם נתקלת במחסום נגישות כלשהו באתר, או אם אתה זקוק לתוכן בפורמט חלופי, אנא פנה לרכז הנגישות שלנו:</P>
        <div className="mt-4 p-5 border border-charcoal/10 bg-bone-dark text-start">
          <p className="font-heading font-bold text-charcoal text-base mb-1">מוטי איתן</p>
          <p className="text-charcoal/50 text-xs mb-3">רכז נגישות, חברת בנין איתן בע"מ</p>
          <p>דוא"ל: <a href="mailto:office@binyaneitan.com" className="text-accent hover:underline">office@binyaneitan.com</a></p>
          <p>טל&#39;: <a href="tel:+97225000447" className="text-accent hover:underline">02-5000447</a></p>
        </div>
        <P>אנו שואפים להשיב לפניות נגישות תוך 5 ימי עסקים.</P>
      </Section>

      <Section title="משוב">
        <P>אנו מברכים על כל משוב בנוגע לנגישות האתר. אנא פנה אלינו אם נתקלת בקושי כלשהו — הערותיך יסייעו לנו להשתפר.</P>
      </Section>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LegalPage() {
  const { lang, dir } = useLang();
  const l = lang as "en" | "he";
  const tabList = tabs[l];
  const [active, setActive] = useState<Tab>("terms");

  const headings = {
    en: { title: "Legal Information", sub: "Terms of Use · Privacy Policy · Accessibility Statement" },
    he: { title: "מסמכים משפטיים", sub: "תנאי שימוש · מדיניות פרטיות · הצהרת נגישות" },
  };
  const { title, sub } = headings[l];

  return (
    <main className="relative" dir={dir}>
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-charcoal pt-40 pb-20 md:pt-52 md:pb-28">
        <div className="mx-auto max-w-7xl px-8">
          <p className="overline-label !text-warm-gray mb-6">
            <span className="me-3 inline-block h-px w-6 bg-accent align-middle" />
            {l === "he" ? "מסמכים רשמיים" : "Official Documents"}
          </p>
          <h1 className="font-heading text-4xl font-bold text-bone md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-4 font-body text-sm text-bone/40 tracking-wide">{sub}</p>
        </div>
      </section>

      {/* ── Tab navigation ── */}
      <div className="sticky top-0 z-40 bg-bone-dark border-b border-charcoal/[0.06] shadow-sm">
        <div className="mx-auto max-w-7xl px-8">
          <div className="flex gap-0 overflow-x-auto" role="tablist">
            {tabList.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                onClick={() => setActive(t.id)}
                className={`shrink-0 px-6 py-4 font-body text-xs font-semibold tracking-[0.18em] uppercase transition-colors duration-200 border-b-2 ${
                  active === t.id
                    ? "border-accent text-charcoal"
                    : "border-transparent text-charcoal/40 hover:text-charcoal/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <section className="bg-bone py-20 md:py-28" role="tabpanel">
        <div className="mx-auto max-w-[900px] px-6">

          {active === "terms" && (l === "en" ? <TermsEN /> : <TermsHE />)}
          {active === "privacy" && (l === "en" ? <PrivacyEN /> : <PrivacyHE />)}
          {active === "accessibility" && (l === "en" ? <AccessibilityEN /> : <AccessibilityHE />)}

          {/* Back link */}
          <div className="mt-16 pt-8 border-t border-charcoal/[0.06]">
            <Link
              href={`/${l}`}
              className="font-body text-xs font-semibold tracking-[0.18em] uppercase text-charcoal/40 hover:text-accent transition-colors"
            >
              ← {l === "he" ? "חזרה לאתר" : "Back to Site"}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
