import { img } from "../../lib/cloudinary";
import type { ProjectData } from "./types";

const ohelAvshalom: ProjectData = {
  slug: "ohel-avshalom-synagogue-jerusalem",
  num: "03",
  aspect: "4/3",
  heroImage: img("ohel-avshalom.jpg"),
  galleryImages: [
    img("ohel-avshalom.jpg"),
    img("ohel-avshalom-1.jpg"),
    img("ohel-avshalom-2.jpg"),
    img("ohel-avshalom-3.jpg"),
    img("ohel-avshalom-4.jpg"),
    img("ohel-avshalom-5.jpg"),
    img("ohel-avshalom-6.jpg"),
    img("ohel-avshalom-7.jpg"),
    img("ohel-avshalom-8.jpg"),
    img("ohel-avshalom-9.jpg"),
    img("ohel-avshalom-10.jpg"),
    img("ohel-avshalom-11.jpg"),
    img("ohel-avshalom-12.jpg"),
    img("ohel-avshalom-13.jpg"),
    img("ohel-avshalom-14.jpg"),
    img("ohel-avshalom-15.jpg"),
  ],
  dateCompleted: "[DATE - e.g. 2022-12]",
  projectSize: undefined,
  he: {
    title: "מוסדות אוהל אבשלום",
    category: "מוסדות ציבור",
    location: "[מיקום — שכונה, ירושלים]",
    projectType: "הרחבות ותוספות במוסד ציבורי פעיל",
    scope: "הרחבות ותוספות בבניין ציבורי פעיל — עם ניהול שלבי קפדני ואפס הפרעה לפעילות.",
    shortDesc: "הרחבות ותוספות בבניין ציבורי פעיל — עם ניהול שלבי קפדני ואפס הפרעה לפעילות.",
    introParagraph:
      "[פסקת פתיחה בעברית — כ-80 מילים. תאר את הפרויקט במוסדות אוהל אבשלום: מה בוצע, מי הגוף המזמין, ומה הופך פרויקט בבניין פעיל לאתגר הנדסי ולוגיסטי ייחודי.]",
    challengeAndSolution:
      "[אתגר ופתרון בעברית — כ-150 מילים. האתגר המרכזי: עבודה בבניין ציבורי תפוס תוך שמירה על פעילות שוטפת. כלול את תכנון השלבים, הניהול הלוגיסטי, תיאום מול הגוף המזמין, ופתרונות הנדסיים שאפשרו אפס הפרעה.]",
    resultParagraph:
      "[תוצאה בעברית — כ-70 מילים. תאר את התוצאה הסופית ואת שביעות רצון הגוף המזמין.]",
    keyFeatures: [
      "[מאפיין מרכזי 1 — בעברית]",
      "[מאפיין מרכזי 2 — בעברית]",
      "[מאפיין מרכזי 3 — בעברית]",
      "[מאפיין מרכזי 4 — בעברית]",
    ],
  },
  en: {
    title: "Ohel Avshalom Institutions",
    category: "Public Institutions",
    location: "[Location — neighborhood, Jerusalem]",
    projectType: "Expansions & Additions in an Active Public Building",
    scope: "Expansions and additions within an active public building, with strict phased management.",
    shortDesc: "Expansions and additions within an active public building, with strict phased management.",
    introParagraph:
      "[EN intro paragraph — approx. 80 words. Describe the Ohel Avshalom project: what was done, who commissioned it, and what makes construction inside a live public institution a distinctive engineering challenge.]",
    challengeAndSolution:
      "[EN challenge & solution — approx. 150 words. Primary challenge: working inside an occupied public building while maintaining full operations. Include phasing plan, logistics management, coordination with the institution, and engineering solutions that enabled zero disruption.]",
    resultParagraph:
      "[EN result — approx. 70 words. Describe the final outcome and client satisfaction.]",
    keyFeatures: [
      "[Key feature 1 — English]",
      "[Key feature 2 — English]",
      "[Key feature 3 — English]",
      "[Key feature 4 — English]",
    ],
  },
  metadata: {
    titleHE: "[כותרת SEO בעברית — עד 46 תווים]",
    titleEN: "[EN SEO title — up to 45 chars]",
    descriptionHE: "[תיאור מטא בעברית — 140-160 תווים]",
    descriptionEN: "[EN meta description — 140–160 characters]",
  },
};

export default ohelAvshalom;
