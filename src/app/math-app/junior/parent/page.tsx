"use client";

import MathAdminGate from "../../components/MathAdminGate";
import ParentDashboardView from "../../components/ParentDashboardView";

export default function JuniorParentDashboard() {
  return (
    <MathAdminGate>
      <ParentDashboardView backHref="/math-app/junior" storageKey="bm_profiles_junior" />
    </MathAdminGate>
  );
}
