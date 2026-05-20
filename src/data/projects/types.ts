export interface ProjectLang {
  title: string;
  location: string;
  projectType: string;
  scope: string;
  introParagraph: string;
  challengeAndSolution: string;
  resultParagraph: string;
  keyFeatures: string[];
  /** Short card description — used on the /projects index */
  shortDesc: string;
  category: string;
}

export interface ProjectMetadata {
  titleHE: string;
  titleEN: string;
  descriptionHE: string;
  descriptionEN: string;
}

export interface GalleryImage {
  src: string;
  altHE?: string;
  altEN?: string;
}

export interface ProjectData {
  slug: string;
  num: string;
  aspect: "4/3" | "3/4" | "16/9" | "1/1";
  heroImage: string;
  galleryImages: GalleryImage[];
  dateCompleted: string;
  projectSize?: number;
  he: ProjectLang;
  en: ProjectLang;
  metadata: ProjectMetadata;
}
