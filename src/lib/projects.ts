/**
 * GALLERY PROJECTS — single source of truth.
 *
 * To add a project: push a new object to GALLERY_PROJECTS below.
 * Images can be local (/public paths) or full Cloudinary URLs:
 *   e.g. "https://res.cloudinary.com/<cloud>/image/upload/v1/binyan-eitan/my-image.jpg"
 *
 * Categories: "renovations" | "finish" | "infrastructure" | "before-after"
 * Aspect:     "4/3" | "3/4" | "16/9" | "1/1"  — controls card height in masonry grid
 */

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
    cover: "/amshinov-1.jpg",
    aspect: "4/3",
    categories: ["infrastructure"],
    images: [
      "/amshinov-1.jpg",
      "/amshinov-01.jpg",
      "/amshinov-2.jpg",
      "/amshinov-3.jpg",
      "/amshinov-4.jpg",
      "/amshinov-5.jpg",
      "/amshinov-6.jpg",
      "/amshinov-7.jpg",
      "/amshinov-8.jpg",
      "/amshinov-9.jpg",
      "/amshinov-10.jpg",
      "/amshinov-11.jpg",
      "/amshinov-12.jpg",
      "/amshinov-13.jpg",
      "/amshinov-14.jpg",
      "/amshinov-15.jpg",
      "/amshinov-16.jpg",
      "/amshinov-17.jpg",
      "/amshinov-18.jpg",
      "/amshinov-19.jpg",
      "/amshinov-20.jpg",
      "/amshinov-21.jpg",
      "/amshinov-22.jpg",
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
    cover: "/bayit-vegan.jpg",
    aspect: "3/4",
    categories: ["renovations"],
    images: [
      "/bayit-vegan-1.jpg",
      "/bayit-vegan-2.jpg",
      "/bayit-vegan-3.jpg",
      "/bayit-vegan-4.jpg",
      "/bayit-vegan-5.jpg",
      "/bayit-vegan-6.jpg",
      "/bayit-vegan-7.jpg",
      "/bayit-vegan-8.jpg",
      "/bayit-vegan-9.jpg",
      "/bayit-vegan-10.jpg",
      "/bayit-vegan-11.jpg",
      "/bayit-vegan-12.jpg",
      "/bayit-vegan-13.jpg",
      "/bayit-vegan-14.jpg",
      "/bayit-vegan-15.jpg",
      "/bayit-vegan-16.jpg",
      "/bayit-vegan-17.jpg",
      "/bayit-vegan-18.jpg",
      "/bayit-vegan-19.jpg",
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
    cover: "/ohel-avshalom.jpg",
    aspect: "4/3",
    categories: ["renovations", "infrastructure"],
    images: [
      "/ohel-avshalom-1.jpg",
      "/ohel-avshalom-2.jpg",
      "/ohel-avshalom-3.jpg",
      "/ohel-avshalom-4.jpg",
      "/ohel-avshalom-5.jpg",
      "/ohel-avshalom-6.jpg",
      "/ohel-avshalom-7.jpg",
      "/ohel-avshalom-8.jpg",
      "/ohel-avshalom-9.jpg",
      "/ohel-avshalom-10.jpg",
      "/ohel-avshalom-11.jpg",
      "/ohel-avshalom-12.jpg",
      "/ohel-avshalom-13.jpg",
      "/ohel-avshalom-14.jpg",
      "/ohel-avshalom-15.jpg",
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
    cover: "/ramat-eshkol.jpg",
    aspect: "3/4",
    categories: ["finish"],
    images: [
      "/ramat-eshkol.jpg",
      "/ramat-eshkol-penthouse-1.jpg",
      "/ramat-eshkol-penthouse-2.jpg",
      "/ramat-eshkol-penthouse-3.jpg",
      "/ramat-eshkol-penthouse-4.jpg",
      "/ramat-eshkol-penthouse-5.jpg",
      "/ramat-eshkol-penthouse-6.jpg",
      "/ramat-eshkol-penthouse-7.jpg",
      "/ramat-eshkol-penthouse-8.jpg",
      "/ramat-eshkol-penthouse-9.jpg",
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
    cover: "/jerusalem-luxury-living-room.jpg",
    aspect: "16/9",
    categories: ["finish", "renovations"],
    images: [
      "/jerusalem-luxury-living-room.jpg",
      "/jerusalem-black-sink-detail.jpg",
      "/jerusalem-balcony-view.jpg",
      "/jerusalem-stone-drilling-detail.jpg",
      "/jerusalem-site-inspection-motti.jpg",
      "/jerusalem-crane-logistics.jpg",
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
