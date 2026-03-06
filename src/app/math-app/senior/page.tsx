"use client";

import MathAppClient from "../MathAppClient";

// Grade 5–6 Senior — Percentages + Fractions, independent sub-app
export default function SeniorPage() {
  return <MathAppClient topicIds={["percentages", "fractions"]} parentHref="/math-app/parent" storageKey="bm_profiles_senior" />;
}
