/**
 * GALLERY PROJECTS — single source of truth.
 *
 * To add a project: push a new object to GALLERY_PROJECTS below.
 * Images are served from Cloudinary when NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is set,
 * and fall back to /public paths in development.
 *
 * To add a new image: upload it to the "binyan-eitan" folder in Cloudinary,
 * then reference it here by filename only (e.g. "my-new-image.jpg").
 *
 * Categories: "renovations" | "finish" | "infrastructure" | "before-after"
 * Aspect:     "4/3" | "3/4" | "16/9" | "1/1"  — controls card height in masonry grid
 */

import { img } from "./cloudinary";

export type ProjectCategory = "renovations" | "finish" | "infrastructure" | "before-after";

export interface GalleryProject {
  id: string;
  num: string;
  cover: string;
  aspect: "4/3" | "3/4" | "16/9" | "1/1";
  images: string[];
  categories: ProjectCategory[];
  he: { title: string; category: string; shortDesc: string };
  en: { title: string; category: string; shortDesc: string };
}

export const GALLERY_PROJECTS: GalleryProject[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 01 — Amshinov Complex
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "amshinov",
    num: "01",
    cover: img("amshinov-1.jpg"),
    aspect: "4/3",
    categories: ["infrastructure"],
    images: [
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
    he: {
      title: "קומפלקס אמשינוב",
      category: "תשתיות ציבוריות",
      shortDesc: "ביצוע מדויק באזור עירוני עמוס, עם פתרונות הרמה ותכנון לוגיסטי מורכב.",
    },
    en: {
      title: "Amshinov Complex",
      category: "Public Infrastructure",
      shortDesc: "Precision execution in high-traffic urban zones, with complex crane logistics and access management.",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 02 — Bayit Vegan JLM
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "bayit-vegan",
    num: "02",
    cover: img("bayit-vegan.jpg"),
    aspect: "3/4",
    categories: ["renovations"],
    images: [
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
    he: {
      title: "בית וגן ירושלים",
      category: "שיפוץ מבני",
      shortDesc: "החלפת תשתיות מלאה ותוספת מבנית בבניין קיים — עם שמירה על רצף הפעילות.",
    },
    en: {
      title: "Bayit Vegan JLM",
      category: "Structural Renovation",
      shortDesc: "Complete infrastructure replacement and structural expansion in an existing residential building.",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 03 — Ohel Avshalom Institutions
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ohel-avshalom",
    num: "03",
    cover: img("ohel-avshalom.jpg"),
    aspect: "4/3",
    categories: ["renovations", "infrastructure"],
    images: [
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
    he: {
      title: "מוסדות אוהל אבשלום",
      category: "מוסדות ציבור",
      shortDesc: "הרחבות ותוספות בבניין ציבורי פעיל — עם ניהול שלבי קפדני ואפס הפרעה לפעילות.",
    },
    en: {
      title: "Ohel Avshalom Institutions",
      category: "Public Institutions",
      shortDesc: "Expansions and additions within an active public building, with strict phased management.",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 04 — Ramat Eshkol Penthouse
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ramat-eshkol",
    num: "04",
    cover: img("ramat-eshkol.jpg"),
    aspect: "3/4",
    categories: ["finish"],
    images: [
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
    he: {
      title: "פנטהאוס רמת אשכול",
      category: "עבודות גמר פרימיום",
      shortDesc: "לוגיסטיקה מורכבת בקומה גבוהה עם חידוש תשתיות מתקדמות ועיצוב פנים יוקרתי.",
    },
    en: {
      title: "Ramat Eshkol Penthouse",
      category: "Premium Finish Work",
      shortDesc: "High-floor logistics with advanced infrastructure renewal and luxury interior detailing.",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 05 — Jerusalem Luxury Apartment
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "jerusalem-luxury",
    num: "05",
    cover: img("jerusalem-luxury-living-room.jpg"),
    aspect: "16/9",
    categories: ["finish", "renovations"],
    images: [
      img("jerusalem-luxury-living-room.jpg"),
      img("jerusalem-black-sink-detail.jpg"),
      img("jerusalem-balcony-view.jpg"),
      img("jerusalem-stone-drilling-detail.jpg"),
      img("jerusalem-site-inspection-motti.jpg"),
      img("jerusalem-crane-logistics.jpg"),
    ],
    he: {
      title: "דירת יוקרה ירושלים",
      category: "שיפוץ יוקרה",
      shortDesc: "שיפוץ מוחלט של דירה יוקרתית בירושלים — עם חיפויי אבן ירושלמית ועבודות גמר פרימיום.",
    },
    en: {
      title: "Jerusalem Luxury Apartment",
      category: "Luxury Renovation",
      shortDesc: "Full gut renovation of a high-end Jerusalem apartment with Jerusalem stone cladding and premium finishes.",
    },
  },
];
