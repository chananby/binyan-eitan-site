"use client";

import MathAdminGate from "../components/MathAdminGate";
import ParentDashboardView from "../components/ParentDashboardView";

export default function ParentDashboard() {
  return (
    <MathAdminGate>
      <ParentDashboardView backHref="/math-app/senior" storageKey="bm_profiles_senior" />
    </MathAdminGate>
  );
}
