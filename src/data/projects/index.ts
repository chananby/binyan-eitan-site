import amshinov from "./amshinov";
import bayitVegan from "./bayit-vegan";
import ohelAvshalom from "./ohel-avshalom";
import ramatEshkol from "./ramat-eshkol";
import jerusalemLuxury from "./jerusalem-luxury";
import type { ProjectData } from "./types";

export type { ProjectData };

export const ALL_PROJECTS: ProjectData[] = [
  amshinov,
  bayitVegan,
  ohelAvshalom,
  ramatEshkol,
  jerusalemLuxury,
];

export const PROJECT_SLUGS = ALL_PROJECTS.map((p) => p.slug);

export function getProjectBySlug(slug: string): ProjectData | undefined {
  return ALL_PROJECTS.find((p) => p.slug === slug);
}
