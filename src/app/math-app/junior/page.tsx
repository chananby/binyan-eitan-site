"use client";

import MathAppClient from "../MathAppClient";

// Grade 3 Junior — Space theme, independent sub-app
export default function JuniorPage() {
  return <MathAppClient topicIds={["grade3"]} parentHref="/math-app/junior/parent" storageKey="bm_profiles_junior" />;
}
