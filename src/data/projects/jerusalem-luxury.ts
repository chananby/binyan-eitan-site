import { img } from "../../lib/cloudinary";
import type { ProjectData } from "./types";

const jerusalemLuxury: ProjectData = {
  slug: "jerusalem-luxury-residence",
  num: "05",
  aspect: "16/9",
  heroImage: img("jerusalem-luxury-living-room.jpg"),
  galleryImages: [
    img("jerusalem-luxury-living-room.jpg"),
    img("jerusalem-black-sink-detail.jpg"),
    img("jerusalem-balcony-view.jpg"),
    img("jerusalem-stone-drilling-detail.jpg"),
    img("jerusalem-site-inspection-motti.jpg"),
    img("jerusalem-crane-logistics.jpg"),
  ],
  dateCompleted: "[DATE - e.g. 2024-02]",
  projectSize: undefined,
  he: {
    title: "דירת יוקרה ירושלים",
    category: "שיפוץ יוקרה",
    location: "ירושלים",
    projectType: "שיפוץ יוקרה מלא",
    scope: "שיפוץ מוחלט של דירה יוקרתית בירושלים — עם חיפויי אבן ירושלמית ועבודות גמר פרימיום.",
    shortDesc: "שיפוץ מוחלט של דירה יוקרתית בירושלים — עם חיפויי אבן ירושלמית ועבודות גמר פרימיום.",
    introParagraph:
      "[פסקת פתיחה בעברית — כ-80 מילים. תאר את פרויקט דירת היוקרה בירושלים: מהות העבודה המלאה, מי המזמין, ומה מייחד שיפוץ יוקרה הכולל אבן ירושלמית ועיצוב פנים ברמה הגבוהה ביותר.]",
    challengeAndSolution:
      "[אתגר ופתרון בעברית — כ-150 מילים. האתגרים: עבודה עם אבן ירושלמית בדירה קיימת, ניהול לוגיסטיקה מורכבת (כולל קרניים), שמירה על רמת גמר ארכיטקטונית גבוהה בכל פרט. כלול את הפתרונות ואת שיטת ניהול הגמר הפרימיום.]",
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
    title: "Jerusalem Luxury Apartment",
    category: "Luxury Renovation",
    location: "Jerusalem",
    projectType: "Full Luxury Renovation",
    scope: "Full gut renovation of a high-end Jerusalem apartment with Jerusalem stone cladding and premium finishes.",
    shortDesc: "Full gut renovation of a high-end Jerusalem apartment with Jerusalem stone cladding and premium finishes.",
    introParagraph:
      "[EN intro paragraph — approx. 80 words. Describe the Jerusalem luxury apartment project: scope of the full renovation, client profile, and what distinguishes a luxury renovation featuring Jerusalem stone and highest-tier interior design.]",
    challengeAndSolution:
      "[EN challenge & solution — approx. 150 words. Challenges: working with Jerusalem stone in an existing apartment, managing complex logistics (including crane work), maintaining architectural-grade finish quality throughout. Include the solutions and premium finish management methodology.]",
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

export default jerusalemLuxury;
