import { redirect } from "next/navigation";

// Executive War Room has been archived — redirect to Hub
export default function ExecutivePage() {
  redirect("/admin/hub");
}
