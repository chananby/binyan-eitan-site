import { img } from "../../lib/cloudinary";
import type { ProjectData } from "./types";

const ramatEshkol: ProjectData = {
  slug: "ramat-eshkol-penthouse",
  num: "04",
  aspect: "3/4",
  heroImage: img("ramat-eshkol.jpg"),
  galleryImages: [
    img("ramat-eshkol.jpg"),
    img("ramat-eshkol-penthouse-1.jpg"),
    img("ramat-eshkol-penthouse-2.jpg"),
    img("ramat-eshkol-penthouse-3.jpg"),
    img("ramat-eshkol-penthouse-4.jpg"),
    img("ramat-eshkol-penthouse-5.jpg"),
    img("ramat-eshkol-penthouse-6.jpg"),
    img("ramat-eshkol-penthouse-7.jpg"),
    img("ramat-eshkol-penthouse-8.jpg"),
    img("ramat-eshkol-penthouse-9.jpg"),
  ],
  dateCompleted: "[DATE - e.g. 2023-04]",
  projectSize: undefined,
  he: {
    title: "פנטהאוס רמת אשכול",
    category: "עבודות גמר פרימיום",
    location: "רמת אשכול, ירושלים",
    projectType: "עבודות גמר פרימיום בקומה עליונה",
    scope: "לוגיסטיקה מורכבת בקומה גבוהה עם חידוש תשתיות מתקדמות ועיצוב פנים יוקרתי.",
    shortDesc: "לוגיסטיקה מורכבת בקומה גבוהה עם חידוש תשתיות מתקדמות ועיצוב פנים יוקרתי.",
    introParagraph:
      "[פסקת פתיחה בעברית — כ-80 מילים. תאר את פרויקט הפנטהאוס ברמת אשכול: מהות העבודה, מי המזמין, ומה הופך גמר יוקרה בקומה גבוהה לאתגר הנדסי ולוגיסטי מיוחד.]",
    challengeAndSolution:
      "[אתגר ופתרון בעברית — כ-150 מילים. האתגרים: הובלת חומרים כבדים לקומה עליונה, חידוש תשתיות (חשמל, אינסטלציה, מיזוג) ללא פגיעה בשכנים, ועבודות גמר ברמה ארכיטקטונית גבוהה. כלול את הפתרונות ההנדסיים ואת ניהול שרשרת האספקה.]",
    resultParagraph:
      "[תוצאה בעברית — כ-70 מילים. תאר את התוצאה הסופית ואת שביעות רצון הלקוח.]",
    keyFeatures: [
      "[מאפיין מרכזי 1 — בעברית]",
      "[מאפיין מרכזי 2 — בעברית]",
      "[מאפיין מרכזי 3 — בעברית]",
      "[מאפיין מרכזי 4 — בעברית]",
    ],
  },
  en: {
    title: "Ramat Eshkol Penthouse",
    category: "Premium Finish Work",
    location: "Ramat Eshkol, Jerusalem",
    projectType: "Premium Finish Work on Upper Floor",
    scope: "High-floor logistics with advanced infrastructure renewal and luxury interior detailing.",
    shortDesc: "High-floor logistics with advanced infrastructure renewal and luxury interior detailing.",
    introParagraph:
      "[EN intro paragraph — approx. 80 words. Describe the Ramat Eshkol penthouse project: scope of work, client, and what makes high-floor premium finish a distinctive engineering and logistical challenge.]",
    challengeAndSolution:
      "[EN challenge & solution — approx. 150 words. Challenges: transporting heavy materials to an upper floor, renewing infrastructure (electrical, plumbing, HVAC) without disrupting neighbors, and delivering architectural-grade finish work. Include the engineering solutions and supply-chain management approach.]",
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

export default ramatEshkol;
