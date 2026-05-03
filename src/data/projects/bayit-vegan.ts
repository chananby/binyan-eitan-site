import { img } from "../../lib/cloudinary";
import type { ProjectData } from "./types";

const bayitVegan: ProjectData = {
  slug: "bayit-vegan-luxury-apartment",
  num: "02",
  aspect: "3/4",
  heroImage: img("bayit-vegan.jpg"),
  galleryImages: [
    img("bayit-vegan.jpg"),
    img("bayit-vegan-1.jpg"),
    img("bayit-vegan-2.jpg"),
    img("bayit-vegan-3.jpg"),
    img("bayit-vegan-4.jpg"),
    img("bayit-vegan-5.jpg"),
    img("bayit-vegan-6.jpg"),
    img("bayit-vegan-7.jpg"),
    img("bayit-vegan-8.jpg"),
    img("bayit-vegan-9.jpg"),
    img("bayit-vegan-10.jpg"),
    img("bayit-vegan-11.jpg"),
    img("bayit-vegan-12.jpg"),
    img("bayit-vegan-13.jpg"),
    img("bayit-vegan-14.jpg"),
    img("bayit-vegan-15.jpg"),
    img("bayit-vegan-16.jpg"),
    img("bayit-vegan-17.jpg"),
    img("bayit-vegan-18.jpg"),
    img("bayit-vegan-19.jpg"),
  ],
  dateCompleted: "[DATE - e.g. 2022-06]",
  projectSize: undefined,
  he: {
    title: "בית וגן ירושלים",
    category: "שיפוץ מבני",
    location: "בית וגן, ירושלים",
    projectType: "שיפוץ מבני ותוספת בנייה",
    scope: "החלפת תשתיות מלאה ותוספת מבנית בבניין קיים — עם שמירה על רצף הפעילות.",
    shortDesc: "החלפת תשתיות מלאה ותוספת מבנית בבניין קיים — עם שמירה על רצף הפעילות.",
    introParagraph:
      "[פסקת פתיחה בעברית — כ-80 מילים. תאר את הפרויקט בשכונת בית וגן בירושלים: מה בוצע, מי המזמין, ומה הופך את הפרויקט לייחודי בהיבט ההנדסי והלוגיסטי.]",
    challengeAndSolution:
      "[אתגר ופתרון בעברית — כ-150 מילים. פרט את האתגרים: שמירה על רצף הפעילות בבניין קיים, החלפת תשתיות מורכבת, תוספות מבניות בחלל מוגבל. כלול את הפתרון ההנדסי ואת שיטת הניהול השלבי.]",
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
    title: "Bayit Vegan JLM",
    category: "Structural Renovation",
    location: "Bayit Vegan, Jerusalem",
    projectType: "Structural Renovation & Building Addition",
    scope: "Complete infrastructure replacement and structural expansion in an existing residential building.",
    shortDesc: "Complete infrastructure replacement and structural expansion in an existing residential building.",
    introParagraph:
      "[EN intro paragraph — approx. 80 words. Describe the Bayit Vegan Jerusalem project: what was done, who commissioned it, and what makes it noteworthy from an engineering and logistical standpoint.]",
    challengeAndSolution:
      "[EN challenge & solution — approx. 150 words. Detail the challenges: maintaining occupancy continuity in a live building, complex infrastructure replacement, structural additions in constrained spaces. Include the engineering solution and phased management approach.]",
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

export default bayitVegan;
