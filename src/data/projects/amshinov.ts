import { img } from "../../lib/cloudinary";
import type { ProjectData } from "./types";

const amshinov: ProjectData = {
  slug: "amshinov-beis-medrash-jerusalem",
  num: "01",
  aspect: "4/3",
  heroImage: img("amshinov-1.jpg"),
  galleryImages: [
    img("amshinov-1.jpg"),
    img("amshinov-01.jpg"),
    img("amshinov-2.jpg"),
    img("amshinov-3.jpg"),
    img("amshinov-4.jpg"),
    img("amshinov-5.jpg"),
    img("amshinov-6.jpg"),
    img("amshinov-7.jpg"),
    img("amshinov-8.jpg"),
    img("amshinov-9.jpg"),
    img("amshinov-10.jpg"),
    img("amshinov-11.jpg"),
    img("amshinov-12.jpg"),
    img("amshinov-13.jpg"),
    img("amshinov-14.jpg"),
    img("amshinov-15.jpg"),
    img("amshinov-16.jpg"),
    img("amshinov-17.jpg"),
    img("amshinov-18.jpg"),
    img("amshinov-19.jpg"),
    img("amshinov-20.jpg"),
    img("amshinov-21.jpg"),
    img("amshinov-22.jpg"),
  ],
  dateCompleted: "[DATE - e.g. 2023-09]",
  projectSize: undefined,
  he: {
    title: "קומפלקס אמשינוב",
    category: "תשתיות ציבוריות",
    location: "[מיקום — שכונה, ירושלים]",
    projectType: "תשתיות ציבוריות ועבודות הנדסיות",
    scope: "ביצוע מדויק באזור עירוני עמוס, עם פתרונות הרמה ותכנון לוגיסטי מורכב.",
    shortDesc: "ביצוע מדויק באזור עירוני עמוס, עם פתרונות הרמה ותכנון לוגיסטי מורכב.",
    introParagraph:
      "[פסקת פתיחה בעברית — כ-80 מילים. תאר את הפרויקט בהיבט הכולל: מה בוצע, איפה, ומה הופך אותו לייחודי. כלול את שמות הלקוח/הגוף המזמין ואת האתגר הכללי שעמד בבסיס הפרויקט.]",
    challengeAndSolution:
      "[אתגר ופתרון בעברית — כ-150 מילים. פרט את האתגר ההנדסי או הלוגיסטי המרכזי: מה היה קשה, מה הגביל, ומה הסיכון. לאחר מכן תאר את הפתרון שיישמנו: הגישה ההנדסית, הכלים, הטכנולוגיה, הצוות, ושיטת הניהול שאיפשרה להתגבר על האתגר בהצלחה.]",
    resultParagraph:
      "[תוצאה בעברית — כ-70 מילים. תאר את התוצאה הסופית: מה הושג, מה מידת שביעות הרצון, והאם היו חריגות בלוח זמנים/תקציב. ניתן לסיים עם ציטוט קצר מהלקוח אם רלוונטי.]",
    keyFeatures: [
      "[מאפיין מרכזי 1 — בעברית]",
      "[מאפיין מרכזי 2 — בעברית]",
      "[מאפיין מרכזי 3 — בעברית]",
      "[מאפיין מרכזי 4 — בעברית]",
    ],
  },
  en: {
    title: "Amshinov Complex",
    category: "Public Infrastructure",
    location: "[Location — neighborhood, Jerusalem]",
    projectType: "Public Infrastructure & Engineering Works",
    scope: "Precision execution in high-traffic urban zones, with complex crane logistics and access management.",
    shortDesc: "Precision execution in high-traffic urban zones, with complex crane logistics and access management.",
    introParagraph:
      "[EN intro paragraph — approx. 80 words. Describe the project in its full context: what was built, where, and what makes it distinctive. Include the client name and the core challenge that drove the project.]",
    challengeAndSolution:
      "[EN challenge & solution — approx. 150 words. Detail the primary engineering or logistical challenge: what was difficult, what constrained us, what was at risk. Then describe our solution: the engineering approach, tools, technology, team structure, and management method that allowed us to overcome the challenge successfully.]",
    resultParagraph:
      "[EN result — approx. 70 words. Describe the final outcome: what was achieved, satisfaction level, and whether there were any deviations in timeline/budget. Optionally end with a brief client quote.]",
    keyFeatures: [
      "[Key feature 1 — English]",
      "[Key feature 2 — English]",
      "[Key feature 3 — English]",
      "[Key feature 4 — English]",
    ],
  },
  metadata: {
    titleHE: "[כותרת SEO בעברית — עד 46 תווים (עם סיומת | בניין איתן = עד 60)]",
    titleEN: "[EN SEO title — up to 45 chars (with suffix | Binyan Eitan = up to 60)]",
    descriptionHE: "[תיאור מטא בעברית — 140-160 תווים]",
    descriptionEN: "[EN meta description — 140–160 characters]",
  },
};

export default amshinov;
