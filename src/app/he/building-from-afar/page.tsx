"use client";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "בנייה בישראל מרחוק | בניין איתן",
  description: "ניהול פרויקטים על פני הפרש זמן של 7 שעות, דוחות יומיים ושילוב חומרים בינלאומיים.",
  robots: "noindex, nofollow",
};

const HeBuildingFromAfarClient = dynamic(() => import("../../components/ClientLayouts/HeBuildingFromAfarClient"), { ssr: false });

export default function BuildingFromAfarHE() {
  return <HeBuildingFromAfarClient />;
}

export default function BuildingFromAfarHE() {
  return (
    <main className="relative bg-bone" dir="rtl">
      <Navbar />
      <section className="py-24 px-8 max-w-3xl mx-auto">
        <motion.h1
          className="font-heading text-4xl font-bold text-charcoal mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          בנייה בישראל מרחוק
        </motion.h1>
        <motion.p
          className="text-lg text-charcoal/80 mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          עבודה על פני הפרש זמן של שבע שעות אינה אדישה. אנו מספקים דוחות יומיים,
          תקשורת ברורה ושקיפות מלאה ללקוחות באירופה ובאמריקה.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <motion.h2 className="text-2xl font-semibold text-charcoal mb-4">
              דוחות יומיים ותקשורת
            </motion.h2>
            <motion.p
              className="text-base text-charcoal/80"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              צפו לעדכון מפורט כל 24 שעות, עם תמונות, סטטוס וכל החלטה נדרשת. אנו
              מתאימים את לוח הזמנים שלנו כדי לשמור על לקוח בחזית במהלך שעות היום שלו.
            </motion.p>
          </div>
          <div>
            <motion.h2 className="text-2xl font-semibold text-charcoal mb-4">
              שילוב חומרים בינלאומיים
            </motion.h2>
            <motion.p
              className="text-base text-charcoal/80"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              אנו מתמחים בייבוא ובשילוב חומרים יוקרתיים מחו\"ל — אבן, זכוכית, משקופים
              ומערכות — ומתכללים לוגיסטיקה ועמידה בדרישות מקומיות כך שהחזון שלכם
              מתבצע בצורה חלקה.
            </motion.p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
