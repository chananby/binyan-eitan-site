"use client";

import MathAppClient from "../MathAppClient";

// Grade 3–4 Junior — Space theme, independent sub-app
export default function JuniorPage() {
  return <MathAppClient topicIds={["grade3", "grade3-division", "grade4"]} parentHref="/math-app/junior/parent" storageKey="bm_profiles_junior" />;
}
