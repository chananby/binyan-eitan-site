import AboutPage from "../../components/AboutPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "המשרד | בניין איתן",
  description:
    'מזה שני עשורים שחברת "בנין איתן" מובילה פרויקטים מורכבים ויוקרתיים בישראל. מוטי איתן, מייסד ובעלים — מעל 20 שנה של הנדסה, פיקוח וניהול פרויקטים.',
};

export default function HeAboutPage() {
  return <AboutPage />;
}
