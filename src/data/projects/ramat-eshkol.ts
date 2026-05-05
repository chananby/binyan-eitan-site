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
  dateCompleted: "",
  projectSize: undefined,
  he: {
    title: "פנטהאוס רמת אשכול",
    category: "עבודות גמר פרימיום",
    location: "רמת אשכול, ירושלים",
    projectType: "עבודות גמר פרימיום בקומה עליונה",
    scope: "לוגיסטיקה מורכבת בקומה גבוהה עם חידוש תשתיות מתקדמות ועיצוב פנים יוקרתי.",
    shortDesc: "לוגיסטיקה מורכבת בקומה גבוהה עם חידוש תשתיות מתקדמות ועיצוב פנים יוקרתי.",
    introParagraph: "תוכן בהכנה. נא לחזור בקרוב.",
    challengeAndSolution: "תוכן בהכנה. נא לחזור בקרוב.",
    resultParagraph: "תוכן בהכנה. נא לחזור בקרוב.",
    keyFeatures: [
      "תוכן בהכנה. נא לחזור בקרוב.",
      "תוכן בהכנה. נא לחזור בקרוב.",
      "תוכן בהכנה. נא לחזור בקרוב.",
      "תוכן בהכנה. נא לחזור בקרוב.",
    ],
  },
  en: {
    title: "Ramat Eshkol Penthouse",
    category: "Premium Finish Work",
    location: "Ramat Eshkol, Jerusalem",
    projectType: "Premium Finish Work on Upper Floor",
    scope: "High-floor logistics with advanced infrastructure renewal and luxury interior detailing.",
    shortDesc: "High-floor logistics with advanced infrastructure renewal and luxury interior detailing.",
    introParagraph: "Content in preparation. Please check back soon.",
    challengeAndSolution: "Content in preparation. Please check back soon.",
    resultParagraph: "Content in preparation. Please check back soon.",
    keyFeatures: [
      "Content in preparation. Please check back soon.",
      "Content in preparation. Please check back soon.",
      "Content in preparation. Please check back soon.",
      "Content in preparation. Please check back soon.",
    ],
  },
  metadata: {
    titleHE: "תוכן בהכנה",
    titleEN: "Content in preparation",
    descriptionHE: "תוכן בהכנה. נא לחזור בקרוב.",
    descriptionEN: "Content in preparation. Please check back soon.",
  },
};

export default ramatEshkol;
