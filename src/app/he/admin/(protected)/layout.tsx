import { redirect } from "next/navigation";
import { isAdminAuthed } from "../../../../lib/admin-auth";

// Server component — checks httpOnly cookie before rendering any admin page.
// If unauthenticated, redirects to the login page (which lives outside this
// route group and therefore outside this layout).
export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!isAdminAuthed()) {
    redirect("/he/admin/login");
  }
  return <>{children}</>;
}
