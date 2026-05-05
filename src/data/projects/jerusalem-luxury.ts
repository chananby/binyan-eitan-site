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
  dateCompleted: "",
  projectSize: undefined,
  he: {
    title: "דירת יוקרה ירושלים",
    category: "שיפוץ יוקרה",
    location: "ירושלים",
    projectType: "שיפוץ יוקרה מלא",
    scope: "שיפוץ מוחלט של דירה יוקרתית בירושלים — עם חיפויי אבן ירושלמית ועבודות גמר פרימיום.",
    shortDesc: "שיפוץ מוחלט של דירה יוקרתית בירושלים — עם חיפויי אבן ירושלמית ועבודות גמר פרימיום.",
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
    title: "Jerusalem Luxury Apartment",
    category: "Luxury Renovation",
    location: "Jerusalem",
    projectType: "Full Luxury Renovation",
    scope: "Full gut renovation of a high-end Jerusalem apartment with Jerusalem stone cladding and premium finishes.",
    shortDesc: "Full gut renovation of a high-end Jerusalem apartment with Jerusalem stone cladding and premium finishes.",
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

export default jerusalemLuxury;
