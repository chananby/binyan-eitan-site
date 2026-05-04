import { redirect } from "next/navigation";

// Cockpit has been archived — redirect to Hub
export default function CockpitPage() {
  redirect("/admin/hub");
}
