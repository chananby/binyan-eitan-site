"use client";

import MathAppClient from "./MathAppClient";

// Senior hub — Grade 5-6 topics only (grade3 lives at /math-app/junior)
export default function MathAppPage() {
  return <MathAppClient topicIds={["percentages", "fractions"]} />;
}
